const supabase = require('../config/db');
const { formatBooking } = require('../utils/bookingFormatter');
const { broadcast, getIO } = require('./serviceController');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const VALID_PAYMENT_METHODS = [
  'cash',
  'online',
  'upi',
  'card',
  'netbanking'
];

const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'accepted',
  'arriving',
  'in_service'
];


/*
|--------------------------------------------------------------------------
| HELPER - GENERATE BOOKING ID
|--------------------------------------------------------------------------
*/

const generateBookingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `RM-${timestamp}-${random}`;
};


/*
|--------------------------------------------------------------------------
| HELPER - CONVERT SERVICES OBJECT
|--------------------------------------------------------------------------
|
| Frontend sends:
|
| {
|   luggage: 2,
|   escort: true,
|   language: false,
|   wheelchair: false,
|   snacks: true,
|   transport: false
| }
|
| Database stores:
|
| "Luggage Assistance (2 items), Seat Escorting, Snacks & Water"
|
|--------------------------------------------------------------------------
*/

const buildServiceData = (services) => {
  const selectedServices = [];

  if (
    services &&
    services.luggage &&
    Number(services.luggage) > 0
  ) {
    const quantity = Number(services.luggage);

    selectedServices.push(
      `Luggage Assistance (${quantity} ${
        quantity === 1 ? 'item' : 'items'
      })`
    );
  }

  if (services && services.escort) {
    selectedServices.push('Seat Escorting');
  }

  if (services && services.language) {
    selectedServices.push('Language Help');
  }

  if (services && services.wheelchair) {
    selectedServices.push('Wheelchair & Elderly');
  }

  if (services && services.snacks) {
    selectedServices.push('Snacks & Water');
  }

  if (services && services.transport) {
    selectedServices.push('Exit Transport Help');
  }

  return selectedServices;
};


/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings
|
|--------------------------------------------------------------------------
*/

exports.createBooking = async (req, res) => {
  try {
    const {
      train_no,
      train_name,
      station_code,
      journey_date,
      journey_time,
      services,
      total_price,
      payment_method,
      coach,
      seat_number,
      berth_type,
      action_type,
      pnr,
      platform
    } = req.body;


    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!userExists) {
      return res.status(401).json({
        message: 'Your session has expired. Please log out and log in again to sync your account.'
      });
    }

    if (!train_no) {
      return res.status(400).json({
        message: 'Train number is required.'
      });
    }

    if (!train_name) {
      return res.status(400).json({
        message: 'Train name is required.'
      });
    }

    if (!station_code) {
      return res.status(400).json({
        message: 'Station is required.'
      });
    }

    if (!journey_date) {
      return res.status(400).json({
        message: 'Journey date is required.'
      });
    }

    if (!services) {
      return res.status(400).json({
        message: 'Service is required.'
      });
    }

    if (
      total_price === undefined ||
      total_price === null ||
      Number(total_price) <= 0
    ) {
      return res.status(400).json({
        message: 'Valid total price is required.'
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        message: 'Payment method is required.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE PAYMENT METHOD
    |--------------------------------------------------------------------------
    */

    const normalizedPaymentMethod =
      String(payment_method).toLowerCase();

    if (
      !VALID_PAYMENT_METHODS.includes(
        normalizedPaymentMethod
      )
    ) {
      return res.status(400).json({
        message: `Invalid payment method. Allowed methods: ${VALID_PAYMENT_METHODS.join(
          ', '
        )}.`
      });
    }


    /*
    |--------------------------------------------------------------------------
    | BUILD SERVICE
    |--------------------------------------------------------------------------
    */

    const selectedServices =
      buildServiceData(services);

    if (selectedServices.length === 0) {
      return res.status(400).json({
        message: 'Please select at least one service.'
      });
    }

    const service =
      selectedServices.join(', ');


    /*
    |--------------------------------------------------------------------------
    | SERVICE DESCRIPTION
    |--------------------------------------------------------------------------
    */

    let serviceDescription =
      `Requested services: ${service}`;

    if (coach || seat_number) {
      serviceDescription += ` | Coach: ${coach || 'TBD'}, Seat: ${seat_number || 'TBD'}`;
      if (berth_type) serviceDescription += ` (${berth_type})`;
    }
    if (action_type === 'collect_from_seat') {
      serviceDescription += ` | Mission: De-boarding (Collect from Seat)`;
    } else {
      serviceDescription += ` | Mission: Boarding (Load into Seat/Berth)`;
    }

    if (journey_time) {
      serviceDescription +=
        ` | Journey time: ${journey_time}`;
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | Your database allows only:
    |
    | pending
    | paid
    | failed
    | refunded
    |
    |--------------------------------------------------------------------------
    */

    let paymentStatus = 'pending';

    if (
      normalizedPaymentMethod === 'cash'
    ) {
      paymentStatus = 'pending';
    } else {
      /*
      |--------------------------------------------------------------------------
      | Current system treats online payment as paid
      |--------------------------------------------------------------------------
      |
      | Later, when a real payment gateway is connected,
      | this should only become "paid" after payment verification.
      |
      |--------------------------------------------------------------------------
      */

      paymentStatus = 'paid';
    }


    /*
    |--------------------------------------------------------------------------
    | GENERATE BOOKING ID
    |--------------------------------------------------------------------------
    */

    const bookingId =
      generateBookingId();


    /*
    |--------------------------------------------------------------------------
    | INSERT BOOKING
    |--------------------------------------------------------------------------
    */

    const bookingData = {
      booking_id: bookingId,

      passenger_id: req.user.id,

      assistant_id: null,

      train_number: String(train_no),

      train_name: train_name,

      journey_date: journey_date,

      journey_time: journey_time || null,

      /*
      |--------------------------------------------------------------------------
      | Station where assistance is requested
      |--------------------------------------------------------------------------
      */

      station_code: station_code,

      /*
      |--------------------------------------------------------------------------
      | Your current bookings table has source/destination.
      |
      | The current PassengerDashboard only gives us station_code,
      | so temporarily store station_code in source.
      |
      | Do NOT rely on destination for the assistance station.
      |--------------------------------------------------------------------------
      */

      source: station_code,

      destination: station_code,

      service: service,

      services: {
        ...(typeof services === 'object' ? services : {}),
        coach: coach || services?.coach || null,
        seat_number: seat_number || services?.seat_number || null,
        berth_type: berth_type || services?.berth_type || null,
        action_type: action_type || services?.action_type || 'load_to_seat',
        pnr: pnr || services?.pnr || null,
        platform: platform || services?.platform || null
      },

      service_description: serviceDescription,

      total_price: Number(total_price),

      payment_method:
        normalizedPaymentMethod,

      payment_status: paymentStatus,

      payment_id:
        normalizedPaymentMethod === 'cash'
          ? `PENDING-CASH-${Date.now().toString(36).toUpperCase()}`
          : `TXN-${normalizedPaymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,

      booking_status: 'pending'
    };


    const {
      data,
      error
    } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();


    /*
    |--------------------------------------------------------------------------
    | DATABASE ERROR
    |--------------------------------------------------------------------------
    */

    if (error) {
      console.error(
        'CREATE BOOKING DATABASE ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    /*
    |--------------------------------------------------------------------------
    | SUCCESS — return formatted booking with OTP for passenger & notify admin
    |--------------------------------------------------------------------------
    */

    const formatted = formatBooking(data, { includeOTP: true });

    // Realtime notification to all connected admins & assistants
    try {
      const io = getIO();
      if (io) {
        io.emit('new_booking', formatted);
        io.emit('status_update', formatted);
      }
    } catch (e) {
      console.warn('Socket broadcast warning:', e.message);
    }

    return res.status(201).json(formatted);

  } catch (error) {
    console.error(
      'CREATE BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Server error while creating booking.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET MY BOOKINGS
|--------------------------------------------------------------------------
|
| GET /api/bookings/my-bookings
|
|--------------------------------------------------------------------------
*/

exports.getMyBookings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Get passenger bookings
    |--------------------------------------------------------------------------
    */

    const {
      data: bookings,
      error
    } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .eq(
        'passenger_id',
        req.user.id
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {
      console.error(
        'GET MY BOOKINGS ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Format and return — include OTP for passenger's own bookings
    |--------------------------------------------------------------------------
    */

    const result = (bookings || []).map((b) =>
      formatBooking(b, { includeOTP: true })
    );

    return res.json(result);

  } catch (error) {
    console.error(
      'GET MY BOOKINGS SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load bookings.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
|
| GET /api/bookings/:id
|
|--------------------------------------------------------------------------
*/

exports.getBookingById = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    const {
      data: booking,
      error
    } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .eq(
        'id',
        req.params.id
      )
      .maybeSingle();


    if (error) {
      console.error(
        'GET BOOKING ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    |
    | Passenger can see own booking (incl. OTP).
    | Assigned assistant can see the booking (excl. OTP).
    | Admin can see everything (incl. OTP).
    |--------------------------------------------------------------------------
    */

    const isPassenger =
      booking.passenger_id ===
      req.user.id;

    const isAssistant =
      booking.assistant_id ===
      req.user.id;

    const isAdmin =
      req.user.role === 'admin';


    if (
      !isPassenger &&
      !isAssistant &&
      !isAdmin
    ) {
      return res.status(403).json({
        message: 'You are not authorized to view this booking.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Format and return
    | Passengers and admins get the OTP; assistants do not.
    |--------------------------------------------------------------------------
    */

    const includeOTP = isPassenger || isAdmin;

    return res.json(formatBooking(booking, { includeOTP }));

  } catch (error) {
    console.error(
      'GET BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load booking.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| CANCEL BOOKING BY PASSENGER
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/cancel
|
|--------------------------------------------------------------------------
*/

exports.cancelBooking = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Find booking
    |--------------------------------------------------------------------------
    */

    const {
      data: booking,
      error: findError
    } = await supabase
      .from('bookings')
      .select('*')
      .eq(
        'id',
        req.params.id
      )
      .maybeSingle();


    if (findError) {
      console.error(
        'CANCEL BOOKING FIND ERROR:',
        findError
      );

      return res.status(400).json({
        message: findError.message
      });
    }


    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Make sure passenger owns booking
    |--------------------------------------------------------------------------
    */

    if (
      booking.passenger_id !==
      req.user.id
    ) {
      return res.status(403).json({
        message: 'You are not authorized to cancel this booking.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Check booking status
    |--------------------------------------------------------------------------
    */

    if (
      !ACTIVE_BOOKING_STATUSES.includes(
        booking.booking_status
      )
    ) {
      return res.status(400).json({
        message: 'This booking cannot be cancelled.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Cancel
    |--------------------------------------------------------------------------
    */

    const {
      data,
      error
    } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        updated_at:     new Date().toISOString(),
      })
      .eq(
        'id',
        req.params.id
      )
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();


    if (error) {
      console.error(
        'CANCEL BOOKING UPDATE ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }

    // Notify the assistant (if one was assigned) via socket
    const formatted = formatBooking(data, { includeOTP: true });
    broadcast(req.params.id, formatted);

    return res.json({
      message: 'Booking cancelled successfully.',
      booking: formatted,
      ...formatted,
    });

  } catch (error) {
    console.error(
      'CANCEL BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to cancel booking.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| RATE COMPLETED BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/rating
|
| Body:
|
| {
|   "rating": 5
| }
|
|--------------------------------------------------------------------------
*/

exports.rateBooking = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    const rating =
      Number(req.body.rating);


    /*
    |--------------------------------------------------------------------------
    | Validate rating
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Find booking
    |--------------------------------------------------------------------------
    */

    const {
      data: booking,
      error: findError
    } = await supabase
      .from('bookings')
      .select(
        'id, passenger_id, booking_status'
      )
      .eq(
        'id',
        req.params.id
      )
      .maybeSingle();


    if (findError) {
      return res.status(400).json({
        message: findError.message
      });
    }


    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Verify passenger
    |--------------------------------------------------------------------------
    */

    if (
      booking.passenger_id !==
      req.user.id
    ) {
      return res.status(403).json({
        message: 'You are not authorized to rate this booking.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Only completed bookings can be rated
    |--------------------------------------------------------------------------
    */

    if (
      booking.booking_status !==
      'completed'
    ) {
      return res.status(400).json({
        message: 'Only completed bookings can be rated.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Save rating
    |--------------------------------------------------------------------------
    */

    const {
      data,
      error
    } = await supabase
      .from('bookings')
      .update({
        rating
      })
      .eq(
        'id',
        req.params.id
      )
      .select()
      .single();


    if (error) {
      console.error(
        'RATE BOOKING ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    return res.json({
      message: 'Rating submitted successfully.',
      booking: data
    });

  } catch (error) {
    console.error(
      'RATE BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to submit rating.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| ADMIN - GET ALL BOOKINGS
|--------------------------------------------------------------------------
|
| GET /api/bookings
|
|--------------------------------------------------------------------------
*/

exports.getAllBookings = async (req, res) => {
  try {

    if (
      !req.user ||
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Admin access required.'
      });
    }


    const {
      data: bookings,
      error
    } = await supabase
      .from('bookings')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {
      console.error(
        'GET ALL BOOKINGS ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    return res.json(
      bookings || []
    );

  } catch (error) {
    console.error(
      'GET ALL BOOKINGS SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load bookings.'
    });
  }
};
exports.assignAssistant = async (req, res) => {
  try {
    return res.status(501).json({
      message: 'Assign assistant endpoint is not implemented yet.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to assign assistant.'
    });
  }
};

exports.processPayment = async (req, res) => {
  try {
    return res.status(501).json({
      message: 'Payment endpoint is not implemented yet.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to process payment.'
    });
  }
};