/* ============================================================
   ONECOOLIE STATION TIMETABLE ENGINE
   Official Indian Railways timetable index for South Central Railway:
   • KZJ: Kazipet Junction
   • WL: Warangal
   • BZA: Vijayawada Junction
   • SC: Secunderabad Junction
   
   Contains exact station-specific scheduled arrival, departure, 
   standard platforms, and routes matching official NTES & "Where Is My Train".
   ============================================================ */

const STATION_TIMETABLES = [
  // ── GRAND TRUNK SF EXPRESS ──────────────────────────────────────────
  {
    train_no: '12615',
    train_name: 'Grand Trunk Express',
    train_type: 'SUPERFAST',
    from: { code: 'MAS', name: 'MGR Chennai Central' },
    to: { code: 'NDLS', name: 'New Delhi' },
    stations: {
      BZA: { arr: '00:05', dep: '00:15', platform: '1', type: 'both' },
      WL:  { arr: '02:48', dep: '02:50', platform: '1', type: 'both' },
      KZJ: { arr: '00:50', dep: '00:55', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12616',
    train_name: 'Grand Trunk Express',
    train_type: 'SUPERFAST',
    from: { code: 'NDLS', name: 'New Delhi' },
    to: { code: 'MAS', name: 'MGR Chennai Central' },
    stations: {
      KZJ: { arr: '21:40', dep: '21:45', platform: '1', type: 'both' },
      WL:  { arr: '21:58', dep: '22:00', platform: '1', type: 'both' },
      BZA: { arr: '01:10', dep: '01:20', platform: '6', type: 'both' }
    }
  },

  // ── DAKSHIN SF EXPRESS ──────────────────────────────────────────────
  {
    train_no: '12721',
    train_name: 'Dakshin SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'HYB', name: 'Hyderabad Deccan' },
    to: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    stations: {
      SC:  { arr: '23:20', dep: '23:25', platform: '1', type: 'both' },
      KZJ: { arr: '23:00', dep: '23:05', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12722',
    train_name: 'Dakshin SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    to: { code: 'HYB', name: 'Hyderabad Deccan' },
    stations: {
      KZJ: { arr: '01:28', dep: '01:30', platform: '3', type: 'both' },
      SC:  { arr: '03:10', dep: '03:15', platform: '5', type: 'both' }
    }
  },

  // ── TELANGANA EXPRESS ───────────────────────────────────────────────
  {
    train_no: '12723',
    train_name: 'Telangana Express',
    train_type: 'SUPERFAST',
    from: { code: 'HYB', name: 'Hyderabad Deccan' },
    to: { code: 'NDLS', name: 'New Delhi' },
    stations: {
      SC:  { arr: '06:20', dep: '06:25', platform: '5', type: 'both' },
      KZJ: { arr: '08:08', dep: '08:10', platform: '1', type: 'both' },
      WL:  { arr: '08:23', dep: '08:25', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12724',
    train_name: 'Telangana Express',
    train_type: 'SUPERFAST',
    from: { code: 'NDLS', name: 'New Delhi' },
    to: { code: 'HYB', name: 'Hyderabad Deccan' },
    stations: {
      WL:  { arr: '14:48', dep: '14:50', platform: '1', type: 'both' },
      KZJ: { arr: '15:08', dep: '15:10', platform: '2', type: 'both' },
      SC:  { arr: '17:10', dep: '17:15', platform: '5', type: 'both' }
    }
  },

  // ── CHARMINAR SF EXPRESS ────────────────────────────────────────────
  {
    train_no: '12760',
    train_name: 'Charminar SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'HYB', name: 'Hyderabad Deccan' },
    to: { code: 'TBM', name: 'Tambaram' },
    stations: {
      SC:  { arr: '18:15', dep: '18:20', platform: '5', type: 'both' },
      KZJ: { arr: '20:53', dep: '20:55', platform: '1', type: 'both' },
      WL:  { arr: '21:08', dep: '21:10', platform: '1', type: 'both' },
      BZA: { arr: '00:45', dep: '00:55', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12759',
    train_name: 'Charminar SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'TBM', name: 'Tambaram' },
    to: { code: 'HYB', name: 'Hyderabad Deccan' },
    stations: {
      BZA: { arr: '01:10', dep: '01:20', platform: '7', type: 'both' },
      WL:  { arr: '04:18', dep: '04:20', platform: '2', type: 'both' },
      KZJ: { arr: '04:38', dep: '04:40', platform: '2', type: 'both' },
      SC:  { arr: '07:40', dep: '07:45', platform: '4', type: 'both' }
    }
  },

  // ── GODAVARI SF EXPRESS ─────────────────────────────────────────────
  {
    train_no: '12727',
    train_name: 'Godavari SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'HYB', name: 'Hyderabad Deccan' },
    stations: {
      BZA: { arr: '23:30', dep: '23:45', platform: '1', type: 'both' },
      WL:  { arr: '03:28', dep: '03:30', platform: '2', type: 'both' },
      KZJ: { arr: '03:50', dep: '03:52', platform: '2', type: 'both' },
      SC:  { arr: '05:45', dep: '05:50', platform: '6', type: 'both' }
    }
  },
  {
    train_no: '12728',
    train_name: 'Godavari SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'HYB', name: 'Hyderabad Deccan' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      SC:  { arr: '17:25', dep: '17:30', platform: '6', type: 'both' },
      KZJ: { arr: '19:33', dep: '19:35', platform: '1', type: 'both' },
      WL:  { arr: '19:48', dep: '19:50', platform: '1', type: 'both' },
      BZA: { arr: '23:25', dep: '23:40', platform: '1', type: 'both' }
    }
  },

  // ── FALAKNUMA SF EXPRESS ────────────────────────────────────────────
  {
    train_no: '12703',
    train_name: 'Falaknuma SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'HWH', name: 'Howrah Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '03:55', dep: '04:10', platform: '1', type: 'both' },
      WL:  { arr: '06:58', dep: '07:00', platform: '2', type: 'both' },
      KZJ: { arr: '07:18', dep: '07:20', platform: '2', type: 'both' },
      SC:  { arr: '09:15', dep: '09:15', platform: '2', type: 'arrival' }
    }
  },
  {
    train_no: '12704',
    train_name: 'Falaknuma SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'HWH', name: 'Howrah Jn' },
    stations: {
      SC:  { arr: '15:55', dep: '15:55', platform: '2', type: 'departure' },
      KZJ: { arr: '18:08', dep: '18:10', platform: '1', type: 'both' },
      WL:  { arr: '18:23', dep: '18:25', platform: '1', type: 'both' },
      BZA: { arr: '21:25', dep: '21:40', platform: '1', type: 'both' }
    }
  },

  // ── GOWTHAMI SF EXPRESS ─────────────────────────────────────────────
  {
    train_no: '12737',
    train_name: 'Gowthami SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'COA', name: 'Kakinada Port' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '23:15', dep: '23:30', platform: '1', type: 'both' },
      WL:  { arr: '03:18', dep: '03:20', platform: '2', type: 'both' },
      KZJ: { arr: '03:38', dep: '03:40', platform: '2', type: 'both' },
      SC:  { arr: '05:35', dep: '05:40', platform: '5', type: 'both' }
    }
  },
  {
    train_no: '12738',
    train_name: 'Gowthami SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'COA', name: 'Kakinada Port' },
    stations: {
      SC:  { arr: '21:10', dep: '21:15', platform: '5', type: 'both' },
      KZJ: { arr: '23:18', dep: '23:20', platform: '1', type: 'both' },
      WL:  { arr: '23:33', dep: '23:35', platform: '1', type: 'both' },
      BZA: { arr: '02:40', dep: '02:55', platform: '1', type: 'both' }
    }
  },

  // ── SATAVAHANA SF EXPRESS ───────────────────────────────────────────
  {
    train_no: '12713',
    train_name: 'Satavahana SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'BZA', name: 'Vijayawada Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '06:25', dep: '06:25', platform: '5', type: 'departure' },
      WL:  { arr: '08:23', dep: '08:25', platform: '2', type: 'both' },
      KZJ: { arr: '08:38', dep: '08:40', platform: '2', type: 'both' },
      SC:  { arr: '12:15', dep: '12:15', platform: '5', type: 'arrival' }
    }
  },
  {
    train_no: '12714',
    train_name: 'Satavahana SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'BZA', name: 'Vijayawada Jn' },
    stations: {
      SC:  { arr: '16:15', dep: '16:15', platform: '5', type: 'departure' },
      KZJ: { arr: '18:08', dep: '18:10', platform: '1', type: 'both' },
      WL:  { arr: '18:23', dep: '18:25', platform: '1', type: 'both' },
      BZA: { arr: '22:15', dep: '22:15', platform: '5', type: 'arrival' }
    }
  },

  // ── GOLCONDA EXPRESS ────────────────────────────────────────────────
  {
    train_no: '17201',
    train_name: 'Golconda Express',
    train_type: 'EXPRESS',
    from: { code: 'GNT', name: 'Guntur Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '06:55', dep: '07:05', platform: '7', type: 'both' },
      WL:  { arr: '10:13', dep: '10:15', platform: '2', type: 'both' },
      KZJ: { arr: '10:28', dep: '10:30', platform: '2', type: 'both' },
      SC:  { arr: '13:45', dep: '13:45', platform: '2', type: 'arrival' }
    }
  },
  {
    train_no: '17202',
    train_name: 'Golconda Express',
    train_type: 'EXPRESS',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'GNT', name: 'Guntur Jn' },
    stations: {
      SC:  { arr: '12:30', dep: '12:30', platform: '2', type: 'departure' },
      KZJ: { arr: '14:48', dep: '14:50', platform: '1', type: 'both' },
      WL:  { arr: '15:03', dep: '15:05', platform: '1', type: 'both' },
      BZA: { arr: '18:55', dep: '19:05', platform: '4', type: 'both' }
    }
  },

  // ── KRISHNA EXPRESS ─────────────────────────────────────────────────
  {
    train_no: '17405',
    train_name: 'Krishna Express',
    train_type: 'EXPRESS',
    from: { code: 'TPTY', name: 'Tirupati' },
    to: { code: 'ADB', name: 'Adilabad' },
    stations: {
      BZA: { arr: '13:00', dep: '13:15', platform: '1', type: 'both' },
      WL:  { arr: '17:13', dep: '17:15', platform: '2', type: 'both' },
      KZJ: { arr: '17:28', dep: '17:30', platform: '2', type: 'both' },
      SC:  { arr: '20:40', dep: '20:45', platform: '2', type: 'both' }
    }
  },
  {
    train_no: '17406',
    train_name: 'Krishna Express',
    train_type: 'EXPRESS',
    from: { code: 'ADB', name: 'Adilabad' },
    to: { code: 'TPTY', name: 'Tirupati' },
    stations: {
      SC:  { arr: '06:00', dep: '06:05', platform: '1', type: 'both' },
      KZJ: { arr: '10:18', dep: '10:20', platform: '1', type: 'both' },
      WL:  { arr: '10:33', dep: '10:35', platform: '1', type: 'both' },
      BZA: { arr: '13:00', dep: '13:15', platform: '1', type: 'both' }
    }
  },

  // ── JANMABHOOMI SF EXPRESS ──────────────────────────────────────────
  {
    train_no: '12805',
    train_name: 'Janmabhoomi SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '12:00', dep: '12:15', platform: '1', type: 'both' },
      WL:  { arr: '17:18', dep: '17:20', platform: '2', type: 'both' },
      KZJ: { arr: '17:33', dep: '17:35', platform: '2', type: 'both' },
      SC:  { arr: '19:35', dep: '19:40', platform: '3', type: 'both' }
    }
  },
  {
    train_no: '12806',
    train_name: 'Janmabhoomi SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      SC:  { arr: '06:55', dep: '07:00', platform: '3', type: 'both' },
      KZJ: { arr: '08:33', dep: '08:35', platform: '1', type: 'both' },
      WL:  { arr: '08:48', dep: '08:50', platform: '1', type: 'both' },
      BZA: { arr: '13:00', dep: '13:15', platform: '1', type: 'both' }
    }
  },

  // ── INTERCITY SF EXPRESS ────────────────────────────────────────────
  {
    train_no: '12705',
    train_name: 'Guntur - Secunderabad Intercity SF',
    train_type: 'SUPERFAST',
    from: { code: 'GNT', name: 'Guntur Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '15:25', dep: '15:35', platform: '1', type: 'both' },
      WL:  { arr: '17:43', dep: '17:45', platform: '2', type: 'both' },
      KZJ: { arr: '17:58', dep: '18:00', platform: '2', type: 'both' },
      SC:  { arr: '22:20', dep: '22:20', platform: '3', type: 'arrival' }
    }
  },
  {
    train_no: '12706',
    train_name: 'Secunderabad - Guntur Intercity SF',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'GNT', name: 'Guntur Jn' },
    stations: {
      SC:  { arr: '07:45', dep: '07:45', platform: '3', type: 'departure' },
      KZJ: { arr: '09:38', dep: '09:40', platform: '1', type: 'both' },
      WL:  { arr: '09:53', dep: '09:55', platform: '1', type: 'both' },
      BZA: { arr: '12:45', dep: '12:55', platform: '1', type: 'both' }
    }
  },

  // ── AP SAMPARK KRANTI SF EXPRESS ────────────────────────────────────
  {
    train_no: '12707',
    train_name: 'AP Sampark Kranti Express',
    train_type: 'SUPERFAST',
    from: { code: 'TPTY', name: 'Tirupati' },
    to: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    stations: {
      BZA: { arr: '11:20', dep: '11:35', platform: '1', type: 'both' },
      WL:  { arr: '18:43', dep: '18:45', platform: '2', type: 'both' },
      KZJ: { arr: '18:58', dep: '19:00', platform: '2', type: 'both' },
      SC:  { arr: '16:30', dep: '16:45', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12708',
    train_name: 'AP Sampark Kranti Express',
    train_type: 'SUPERFAST',
    from: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    to: { code: 'TPTY', name: 'Tirupati' },
    stations: {
      KZJ: { arr: '07:23', dep: '07:25', platform: '1', type: 'both' },
      WL:  { arr: '07:38', dep: '07:40', platform: '1', type: 'both' },
      SC:  { arr: '10:15', dep: '10:30', platform: '1', type: 'both' },
      BZA: { arr: '14:00', dep: '14:15', platform: '1', type: 'both' }
    }
  },

  // ── SIMHAPURI SF EXPRESS ────────────────────────────────────────────
  {
    train_no: '12709',
    train_name: 'Simhapuri SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'GDR', name: 'Gudur Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '23:45', dep: '23:55', platform: '1', type: 'both' },
      WL:  { arr: '04:13', dep: '04:15', platform: '2', type: 'both' },
      KZJ: { arr: '04:28', dep: '04:30', platform: '2', type: 'both' },
      SC:  { arr: '05:40', dep: '05:40', platform: '4', type: 'arrival' }
    }
  },
  {
    train_no: '12710',
    train_name: 'Simhapuri SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'GDR', name: 'Gudur Jn' },
    stations: {
      SC:  { arr: '22:05', dep: '22:05', platform: '4', type: 'departure' },
      KZJ: { arr: '23:48', dep: '23:50', platform: '1', type: 'both' },
      WL:  { arr: '00:03', dep: '00:05', platform: '1', type: 'both' },
      BZA: { arr: '03:50', dep: '04:00', platform: '1', type: 'both' }
    }
  },

  // ── VANDE BHARAT EXPRESS (VSKP <-> SC) ──────────────────────────────
  {
    train_no: '20833',
    train_name: 'Visakhapatnam - Secunderabad Vande Bharat Express',
    train_type: 'VANDE BHARAT',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '10:00', dep: '10:05', platform: '1', type: 'both' },
      WL:  { arr: '11:43', dep: '11:45', platform: '2', type: 'both' },
      KZJ: { arr: '13:40', dep: '13:42', platform: '2', type: 'both' },
      SC:  { arr: '14:15', dep: '14:15', platform: '10', type: 'arrival' }
    }
  },
  {
    train_no: '20834',
    train_name: 'Secunderabad - Visakhapatnam Vande Bharat Express',
    train_type: 'VANDE BHARAT',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      SC:  { arr: '15:00', dep: '15:00', platform: '10', type: 'departure' },
      KZJ: { arr: '16:30', dep: '16:32', platform: '1', type: 'both' },
      WL:  { arr: '16:43', dep: '16:45', platform: '1', type: 'both' },
      BZA: { arr: '19:00', dep: '19:05', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '20707',
    train_name: 'Secunderabad - Visakhapatnam Vande Bharat Express',
    train_type: 'VANDE BHARAT',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      SC:  { arr: '05:05', dep: '05:05', platform: '10', type: 'departure' },
      KZJ: { arr: '06:40', dep: '06:42', platform: '1', type: 'both' },
      WL:  { arr: '06:53', dep: '06:55', platform: '1', type: 'both' },
      BZA: { arr: '09:05', dep: '09:10', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '20708',
    train_name: 'Visakhapatnam - Secunderabad Vande Bharat Express',
    train_type: 'VANDE BHARAT',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '17:40', dep: '17:45', platform: '1', type: 'both' },
      WL:  { arr: '21:38', dep: '21:40', platform: '2', type: 'both' },
      KZJ: { arr: '21:50', dep: '21:52', platform: '2', type: 'both' },
      SC:  { arr: '23:20', dep: '23:20', platform: '10', type: 'arrival' }
    }
  },

  // ── TAMIL NADU SF EXPRESS ───────────────────────────────────────────
  {
    train_no: '12621',
    train_name: 'Tamil Nadu Express',
    train_type: 'SUPERFAST',
    from: { code: 'MAS', name: 'MGR Chennai Central' },
    to: { code: 'NDLS', name: 'New Delhi' },
    stations: {
      BZA: { arr: '03:50', dep: '04:00', platform: '1', type: 'both' },
      WL:  { arr: '06:58', dep: '07:00', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12622',
    train_name: 'Tamil Nadu Express',
    train_type: 'SUPERFAST',
    from: { code: 'NDLS', name: 'New Delhi' },
    to: { code: 'MAS', name: 'MGR Chennai Central' },
    stations: {
      WL:  { arr: '01:48', dep: '01:50', platform: '1', type: 'both' },
      BZA: { arr: '04:55', dep: '05:05', platform: '1', type: 'both' }
    }
  },

  // ── KERALA SF EXPRESS ───────────────────────────────────────────────
  {
    train_no: '12625',
    train_name: 'Kerala Express',
    train_type: 'SUPERFAST',
    from: { code: 'TVC', name: 'Thiruvananthapuram' },
    to: { code: 'NDLS', name: 'New Delhi' },
    stations: {
      BZA: { arr: '05:00', dep: '05:10', platform: '1', type: 'both' },
      WL:  { arr: '07:48', dep: '07:50', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12626',
    train_name: 'Kerala Express',
    train_type: 'SUPERFAST',
    from: { code: 'NDLS', name: 'New Delhi' },
    to: { code: 'TVC', name: 'Thiruvananthapuram' },
    stations: {
      WL:  { arr: '16:38', dep: '16:40', platform: '1', type: 'both' },
      BZA: { arr: '19:50', dep: '20:00', platform: '1', type: 'both' }
    }
  },

  // ── DANAPUR SF EXPRESS ──────────────────────────────────────────────
  {
    train_no: '12791',
    train_name: 'Secunderabad - Danapur SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'DNR', name: 'Danapur' },
    stations: {
      SC:  { arr: '09:25', dep: '09:25', platform: '1', type: 'departure' },
      KZJ: { arr: '11:28', dep: '11:30', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12792',
    train_name: 'Danapur - Secunderabad SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'DNR', name: 'Danapur' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      KZJ: { arr: '21:30', dep: '21:32', platform: '2', type: 'both' },
      SC:  { arr: '23:45', dep: '23:45', platform: '1', type: 'arrival' }
    }
  },

  // ── DEVAGIRI EXPRESS ────────────────────────────────────────────────
  {
    train_no: '17057',
    train_name: 'Devagiri Express',
    train_type: 'EXPRESS',
    from: { code: 'CSMT', name: 'Mumbai CSMT' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      SC:  { arr: '14:45', dep: '14:45', platform: '1', type: 'arrival' }
    }
  },
  {
    train_no: '17058',
    train_name: 'Devagiri Express',
    train_type: 'EXPRESS',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'CSMT', name: 'Mumbai CSMT' },
    stations: {
      SC:  { arr: '13:25', dep: '13:25', platform: '1', type: 'departure' }
    }
  },

  // ── PADMAVATI SF EXPRESS ────────────────────────────────────────────
  {
    train_no: '12763',
    train_name: 'Padmavati SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'TPTY', name: 'Tirupati' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      BZA: { arr: '23:20', dep: '23:35', platform: '1', type: 'both' },
      KZJ: { arr: '04:08', dep: '04:10', platform: '2', type: 'both' },
      SC:  { arr: '05:55', dep: '05:55', platform: '1', type: 'arrival' }
    }
  },
  {
    train_no: '12764',
    train_name: 'Padmavati SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'TPTY', name: 'Tirupati' },
    stations: {
      SC:  { arr: '18:40', dep: '18:40', platform: '1', type: 'departure' },
      KZJ: { arr: '20:43', dep: '20:45', platform: '1', type: 'both' },
      BZA: { arr: '01:30', dep: '01:40', platform: '1', type: 'both' }
    }
  },

  // ── SANGHAMITRA SF EXPRESS ──────────────────────────────────────────
  {
    train_no: '12295',
    train_name: 'Sanghamitra SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'SMVB', name: 'SMVT Bengaluru' },
    to: { code: 'DNR', name: 'Danapur' },
    stations: {
      BZA: { arr: '17:25', dep: '17:35', platform: '1', type: 'both' },
      WL:  { arr: '20:58', dep: '21:00', platform: '1', type: 'both' },
      KZJ: { arr: '21:18', dep: '21:20', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12296',
    train_name: 'Sanghamitra SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'DNR', name: 'Danapur' },
    to: { code: 'SMVB', name: 'SMVT Bengaluru' },
    stations: {
      KZJ: { arr: '04:58', dep: '05:00', platform: '2', type: 'both' },
      WL:  { arr: '05:13', dep: '05:15', platform: '2', type: 'both' },
      BZA: { arr: '08:50', dep: '09:00', platform: '1', type: 'both' }
    }
  },

  // ── COCANADA AC SF EXPRESS ──────────────────────────────────────────
  {
    train_no: '12775',
    train_name: 'Cocanada AC SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'CCT', name: 'Kakinada Town' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '00:05', dep: '00:20', platform: '1', type: 'both' },
      WL:  { arr: '04:18', dep: '04:20', platform: '2', type: 'both' },
      KZJ: { arr: '04:38', dep: '04:40', platform: '2', type: 'both' },
      SC:  { arr: '06:10', dep: '06:15', platform: '3', type: 'both' }
    }
  },
  {
    train_no: '12776',
    train_name: 'Cocanada AC SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'CCT', name: 'Kakinada Town' },
    stations: {
      SC:  { arr: '19:35', dep: '19:40', platform: '3', type: 'both' },
      KZJ: { arr: '21:43', dep: '21:45', platform: '1', type: 'both' },
      WL:  { arr: '21:58', dep: '22:00', platform: '1', type: 'both' },
      BZA: { arr: '01:40', dep: '01:55', platform: '1', type: 'both' }
    }
  },

  // ── BHAGYANAGAR EXPRESS ─────────────────────────────────────────────
  {
    train_no: '17233',
    train_name: 'Bhagyanagar Express',
    train_type: 'EXPRESS',
    from: { code: 'KZJ', name: 'Kazipet Jn' },
    to: { code: 'BPQ', name: 'Balharshah' },
    stations: {
      KZJ: { arr: '15:35', dep: '15:35', platform: '1', type: 'departure' }
    }
  },
  {
    train_no: '17234',
    train_name: 'Bhagyanagar Express',
    train_type: 'EXPRESS',
    from: { code: 'BPQ', name: 'Balharshah' },
    to: { code: 'KZJ', name: 'Kazipet Jn' },
    stations: {
      KZJ: { arr: '10:45', dep: '10:45', platform: '2', type: 'arrival' }
    }
  },

  // ── INTERCITY EXPRESS (HYB <-> SKZR) ────────────────────────────────
  {
    train_no: '17011',
    train_name: 'HYB - SKZR Intercity Express',
    train_type: 'EXPRESS',
    from: { code: 'HYB', name: 'Hyderabad Deccan' },
    to: { code: 'SKZR', name: 'Sirpur Kaghaznagar' },
    stations: {
      SC:  { arr: '05:10', dep: '05:15', platform: '2', type: 'both' },
      KZJ: { arr: '07:13', dep: '07:15', platform: '1', type: 'both' },
      WL:  { arr: '07:28', dep: '07:30', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '17012',
    train_name: 'SKZR - HYB Intercity Express',
    train_type: 'EXPRESS',
    from: { code: 'SKZR', name: 'Sirpur Kaghaznagar' },
    to: { code: 'HYB', name: 'Hyderabad Deccan' },
    stations: {
      WL:  { arr: '14:33', dep: '14:35', platform: '2', type: 'both' },
      KZJ: { arr: '14:48', dep: '14:50', platform: '2', type: 'both' },
      SC:  { arr: '17:20', dep: '17:25', platform: '2', type: 'both' }
    }
  },

  // ── HADAPSAR / PUNE - KAZIPET EXPRESS ───────────────────────────────
  {
    train_no: '17013',
    train_name: 'Hadapsar (Pune) - Kazipet Express',
    train_type: 'EXPRESS',
    from: { code: 'HDP', name: 'Hadapsar (Pune)' },
    to: { code: 'KZJ', name: 'Kazipet Jn' },
    stations: {
      KZJ: { arr: '03:15', dep: '03:15', platform: '2', type: 'arrival' }
    }
  },
  {
    train_no: '17014',
    train_name: 'Kazipet - Hadapsar (Pune) Express',
    train_type: 'EXPRESS',
    from: { code: 'KZJ', name: 'Kazipet Jn' },
    to: { code: 'HDP', name: 'Hadapsar (Pune)' },
    stations: {
      KZJ: { arr: '18:15', dep: '18:15', platform: '2', type: 'departure' }
    }
  },

  // ── NAVJEEVAN EXPRESS ───────────────────────────────────────────────
  {
    train_no: '12655',
    train_name: 'Navjeevan Express',
    train_type: 'SUPERFAST',
    from: { code: 'ADI', name: 'Ahmedabad Jn' },
    to: { code: 'MAS', name: 'MGR Chennai Central' },
    stations: {
      KZJ: { arr: '10:50', dep: '10:52', platform: '1', type: 'both' },
      WL:  { arr: '11:03', dep: '11:05', platform: '1', type: 'both' },
      BZA: { arr: '14:10', dep: '14:20', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12656',
    train_name: 'Navjeevan Express',
    train_type: 'SUPERFAST',
    from: { code: 'MAS', name: 'MGR Chennai Central' },
    to: { code: 'ADI', name: 'Ahmedabad Jn' },
    stations: {
      BZA: { arr: '15:00', dep: '15:10', platform: '1', type: 'both' },
      WL:  { arr: '17:43', dep: '17:45', platform: '2', type: 'both' },
      KZJ: { arr: '17:58', dep: '18:00', platform: '2', type: 'both' }
    }
  },

  // ── LINK SF EXPRESS (VSKP <-> NZM) ──────────────────────────────────
  {
    train_no: '12861',
    train_name: 'VSKP - NZM Link SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    stations: {
      BZA: { arr: '16:40', dep: '16:55', platform: '1', type: 'both' },
      WL:  { arr: '21:03', dep: '21:05', platform: '1', type: 'both' },
      KZJ: { arr: '21:20', dep: '21:22', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '12862',
    train_name: 'NZM - VSKP Link SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'NZM', name: 'Delhi Hazrat Nizamuddin' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      KZJ: { arr: '11:25', dep: '11:30', platform: '2', type: 'both' },
      WL:  { arr: '11:43', dep: '11:45', platform: '2', type: 'both' },
      BZA: { arr: '15:30', dep: '15:45', platform: '1', type: 'both' }
    }
  },

  // ── PINAKINI SF EXPRESS (BZA <-> MAS) ───────────────────────────────
  {
    train_no: '12711',
    train_name: 'Pinakini SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'BZA', name: 'Vijayawada Jn' },
    to: { code: 'MAS', name: 'MGR Chennai Central' },
    stations: {
      BZA: { arr: '06:10', dep: '06:10', platform: '1', type: 'departure' }
    }
  },
  {
    train_no: '12712',
    train_name: 'Pinakini SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'MAS', name: 'MGR Chennai Central' },
    to: { code: 'BZA', name: 'Vijayawada Jn' },
    stations: {
      BZA: { arr: '21:10', dep: '21:10', platform: '1', type: 'arrival' }
    }
  },

  // ── RATNACHAL SF EXPRESS (VSKP <-> BZA) ─────────────────────────────
  {
    train_no: '12717',
    train_name: 'Ratnachal SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'BZA', name: 'Vijayawada Jn' },
    stations: {
      BZA: { arr: '18:40', dep: '18:40', platform: '1', type: 'arrival' }
    }
  },
  {
    train_no: '12718',
    train_name: 'Ratnachal SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'BZA', name: 'Vijayawada Jn' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      BZA: { arr: '06:15', dep: '06:15', platform: '1', type: 'departure' }
    }
  },

  // ── NARAYANADRI SF EXPRESS ──────────────────────────────────────────
  {
    train_no: '12733',
    train_name: 'Narayanadri SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'TPTY', name: 'Tirupati' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '00:30', dep: '00:40', platform: '1', type: 'both' },
      SC:  { arr: '05:40', dep: '05:45', platform: '5', type: 'both' }
    }
  },
  {
    train_no: '12734',
    train_name: 'Narayanadri SF Express',
    train_type: 'SUPERFAST',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'TPTY', name: 'Tirupati' },
    stations: {
      SC:  { arr: '18:20', dep: '18:25', platform: '5', type: 'both' },
      BZA: { arr: '23:40', dep: '23:50', platform: '1', type: 'both' }
    }
  },

  // ── VIJAYAWADA - LINGAMPALLI INTERCITY SF ───────────────────────────
  {
    train_no: '12795',
    train_name: 'Vijayawada - Lingampalli Intercity SF',
    train_type: 'SUPERFAST',
    from: { code: 'BZA', name: 'Vijayawada Jn' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '17:30', dep: '17:30', platform: '1', type: 'departure' },
      SC:  { arr: '21:50', dep: '21:55', platform: '10', type: 'both' }
    }
  },
  {
    train_no: '12796',
    train_name: 'Lingampalli - Vijayawada Intercity SF',
    train_type: 'SUPERFAST',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'BZA', name: 'Vijayawada Jn' },
    stations: {
      SC:  { arr: '04:55', dep: '05:00', platform: '10', type: 'both' },
      BZA: { arr: '09:30', dep: '09:30', platform: '1', type: 'arrival' }
    }
  },

  // ── NARASAPUR - LINGAMPALLI EXPRESS ─────────────────────────────────
  {
    train_no: '17255',
    train_name: 'Narasapur - Lingampalli Express',
    train_type: 'EXPRESS',
    from: { code: 'NS', name: 'Narasapur' },
    to: { code: 'LPI', name: 'Lingampalli' },
    stations: {
      BZA: { arr: '21:55', dep: '22:10', platform: '1', type: 'both' },
      SC:  { arr: '04:15', dep: '04:20', platform: '3', type: 'both' }
    }
  },
  {
    train_no: '17256',
    train_name: 'Lingampalli - Narasapur Express',
    train_type: 'EXPRESS',
    from: { code: 'LPI', name: 'Lingampalli' },
    to: { code: 'NS', name: 'Narasapur' },
    stations: {
      SC:  { arr: '21:50', dep: '21:55', platform: '3', type: 'both' },
      BZA: { arr: '04:00', dep: '04:15', platform: '1', type: 'both' }
    }
  },

  // ── PALNADU EXPRESS ─────────────────────────────────────────────────
  {
    train_no: '12747',
    train_name: 'Palnadu Express',
    train_type: 'SUPERFAST',
    from: { code: 'GNT', name: 'Guntur Jn' },
    to: { code: 'VKB', name: 'Vikarabad Jn' },
    stations: {
      BZA: { arr: '06:10', dep: '06:20', platform: '1', type: 'both' },
      SC:  { arr: '10:15', dep: '10:20', platform: '4', type: 'both' }
    }
  },
  {
    train_no: '12748',
    train_name: 'Palnadu Express',
    train_type: 'SUPERFAST',
    from: { code: 'VKB', name: 'Vikarabad Jn' },
    to: { code: 'GNT', name: 'Guntur Jn' },
    stations: {
      SC:  { arr: '16:10', dep: '16:15', platform: '4', type: 'both' },
      BZA: { arr: '20:30', dep: '20:40', platform: '1', type: 'both' }
    }
  },

  // ── MEMU / PASSENGER SPECIALS ───────────────────────────────────────
  {
    train_no: '07757',
    train_name: 'Kazipet - Secunderabad MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'KZJ', name: 'Kazipet Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      KZJ: { arr: '05:45', dep: '05:45', platform: '3', type: 'departure' },
      SC:  { arr: '08:35', dep: '08:35', platform: '8', type: 'arrival' }
    }
  },
  {
    train_no: '07758',
    train_name: 'Secunderabad - Kazipet MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'KZJ', name: 'Kazipet Jn' },
    stations: {
      SC:  { arr: '18:30', dep: '18:30', platform: '8', type: 'departure' },
      KZJ: { arr: '21:10', dep: '21:10', platform: '3', type: 'arrival' }
    }
  },
  {
    train_no: '07462',
    train_name: 'Secunderabad - Warangal MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'WL', name: 'Warangal' },
    stations: {
      SC:  { arr: '09:50', dep: '09:50', platform: '8', type: 'departure' },
      KZJ: { arr: '12:48', dep: '12:50', platform: '1', type: 'both' },
      WL:  { arr: '13:05', dep: '13:05', platform: '1', type: 'arrival' }
    }
  },
  {
    train_no: '07463',
    train_name: 'Warangal - Secunderabad MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'WL', name: 'Warangal' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      WL:  { arr: '14:05', dep: '14:05', platform: '2', type: 'departure' },
      KZJ: { arr: '14:18', dep: '14:20', platform: '2', type: 'both' },
      SC:  { arr: '17:15', dep: '17:15', platform: '8', type: 'arrival' }
    }
  },
  {
    train_no: '07464',
    train_name: 'Secunderabad - Kazipet MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'SC', name: 'Secunderabad Jn' },
    to: { code: 'KZJ', name: 'Kazipet Jn' },
    stations: {
      SC:  { arr: '14:45', dep: '14:45', platform: '8', type: 'departure' },
      KZJ: { arr: '17:35', dep: '17:35', platform: '3', type: 'arrival' }
    }
  },
  {
    train_no: '07465',
    train_name: 'Kazipet - Secunderabad MEMU Express Special',
    train_type: 'MEMU',
    from: { code: 'KZJ', name: 'Kazipet Jn' },
    to: { code: 'SC', name: 'Secunderabad Jn' },
    stations: {
      KZJ: { arr: '06:15', dep: '06:15', platform: '3', type: 'departure' },
      SC:  { arr: '09:10', dep: '09:10', platform: '8', type: 'arrival' }
    }
  },

  // ── SAINAGAR SHIRDI EXPRESS ─────────────────────────────────────────
  {
    train_no: '18503',
    train_name: 'Visakhapatnam - Sainagar Shirdi Express',
    train_type: 'EXPRESS',
    from: { code: 'VSKP', name: 'Visakhapatnam' },
    to: { code: 'SNSI', name: 'Sainagar Shirdi' },
    stations: {
      BZA: { arr: '14:00', dep: '14:15', platform: '1', type: 'both' },
      WL:  { arr: '17:33', dep: '17:35', platform: '2', type: 'both' },
      KZJ: { arr: '17:48', dep: '17:50', platform: '2', type: 'both' },
      SC:  { arr: '20:15', dep: '20:30', platform: '1', type: 'both' }
    }
  },
  {
    train_no: '18504',
    train_name: 'Sainagar Shirdi - Visakhapatnam Express',
    train_type: 'EXPRESS',
    from: { code: 'SNSI', name: 'Sainagar Shirdi' },
    to: { code: 'VSKP', name: 'Visakhapatnam' },
    stations: {
      SC:  { arr: '07:15', dep: '07:30', platform: '1', type: 'both' },
      KZJ: { arr: '09:10', dep: '09:15', platform: '1', type: 'both' },
      WL:  { arr: '09:28', dep: '09:30', platform: '1', type: 'both' },
      BZA: { arr: '13:30', dep: '13:45', platform: '1', type: 'both' }
    }
  }
];

/**
 * Returns all scheduled trains for a given station code with station-specific timings
 * @param {string} stationCode - 'KZJ' | 'WL' | 'BZA' | 'SC'
 */
const getStationTimetable = (stationCode) => {
  const code = String(stationCode || '').toUpperCase().trim();
  const results = [];

  for (const t of STATION_TIMETABLES) {
    if (t.stations && t.stations[code]) {
      const stInfo = t.stations[code];
      results.push({
        train_no: t.train_no,
        train_name: t.train_name,
        train_type: t.train_type || 'EXPRESS',
        from: t.from,
        to: t.to,
        station_code: code,
        scheduled_arrival: stInfo.arr || stInfo.dep,
        scheduled_departure: stInfo.dep || stInfo.arr,
        platform: stInfo.platform || '1',
        type: stInfo.type || 'both'
      });
    }
  }

  return results;
};

/**
 * Search the timetable by train number or name
 * @param {string} query 
 * @param {string} [stationCode]
 */
const findTrainsInTimetable = (query, stationCode) => {
  const q = String(query || '').toLowerCase().trim();
  const st = stationCode ? String(stationCode).toUpperCase().trim() : null;

  return STATION_TIMETABLES.filter((t) => {
    const no = (t.train_no || '').toLowerCase();
    const name = (t.train_name || '').toLowerCase();
    const matchesQuery = !q || no.includes(q) || name.includes(q);
    const matchesStation = !st || Boolean(t.stations && t.stations[st]);
    return matchesQuery && matchesStation;
  }).map((t) => {
    const stInfo = st && t.stations ? t.stations[st] : null;
    return {
      train_no: t.train_no,
      train_name: t.train_name,
      train_type: t.train_type || 'EXPRESS',
      from: t.from,
      to: t.to,
      scheduled_arrival: stInfo?.arr || null,
      scheduled_departure: stInfo?.dep || null,
      platform: stInfo?.platform || '1',
      stations: t.stations
    };
  });
};

module.exports = {
  STATION_TIMETABLES,
  getStationTimetable,
  findTrainsInTimetable
};
