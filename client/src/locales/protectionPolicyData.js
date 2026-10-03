// client/src/locales/protectionPolicyData.js
// Localized 25 Structured Articles & Baggage Limits for ONECOOLIE Journey Protection

export const BAGGAGE_PROTECTION_LIMITS_DEF = [
  {
    tier: 'small',
    limitInr: 2500,
    limitStr: 'Up to ₹2,500',
    weightRange: 'Up to 5 kg',
    labels: {
      en: 'Small Bag',
      te: 'చిన్న బ్యాగ్',
      hi: 'छोटा बैग'
    },
    descriptions: {
      en: 'Light backpacks, small vanity/carry bags, handheld travel kits.',
      te: 'తేలికపాటి బ్యాక్‌ప్యాక్, చిన్న హ్యాండ్‌బ్యాగ్, హ్యాండ్‌హెల్డ్ కిట్.',
      hi: 'हल्के बैकपैक, छोटे वैनिटी/हैंडबैग, हैंडहेल्ड यात्रा किट।'
    }
  },
  {
    tier: 'medium',
    limitInr: 5000,
    limitStr: 'Up to ₹5,000',
    weightRange: '>5 kg – 15 kg',
    labels: {
      en: 'Medium Bag',
      te: 'మధ్యస్థ బ్యాగ్',
      hi: 'मध्यम बैग'
    },
    descriptions: {
      en: 'Standard cabin trolley, overnight duffel, standard travel rucksack.',
      te: 'ప్రామాణిక క్యాబిన్ ట్రాలీ, ఓవర్‌నైట్ డఫెల్, ట్రావెల్ బ్యాగ్.',
      hi: 'मानक केबिन ट्रॉली, ओवरनाइट डफल, मानक यात्रा बैग।'
    }
  },
  {
    tier: 'large',
    limitInr: 10000,
    limitStr: 'Up to ₹10,000',
    weightRange: '>15 kg – 25 kg',
    labels: {
      en: 'Large Bag',
      te: 'పెద్ద బ్యాగ్',
      hi: 'बड़ा बैग'
    },
    descriptions: {
      en: 'Medium to large check-in suitcase, wheeled trunk, heavy luggage.',
      te: 'మధ్యస్థ లేదా పెద్ద సూట్‌కేస్, చక్రాల ట్రంక్, భారీ లగేజీ.',
      hi: 'मध्यम से बड़ा चेक-इन सूटकेस, पहिएदार ट्रंक, भारी सामान।'
    }
  },
  {
    tier: 'extra_large',
    limitInr: 15000,
    limitStr: 'Up to ₹15,000',
    weightRange: '>25 kg',
    labels: {
      en: 'Extra-Large Bag',
      te: 'అదనపు పెద్ద బ్యాగ్',
      hi: 'अतिरिक्त बड़ा बैग'
    },
    descriptions: {
      en: 'Oversized heavy cargo trunk, extra-large transit baggage.',
      te: 'భారీ కార్గో ట్రంక్, అదనపు పెద్ద ప్రయాణ లగేజీ.',
      hi: 'अति-विशाल भारी कार्गो ट्रंक, अतिरिक्त बड़ा ट्रांजिट सामान।'
    }
  }
];

export const DAMAGE_TERMS_DEF = [
  {
    id: 1,
    status: 'excluded',
    type: { en: 'Minor scratches', te: 'చిన్న గీతలు', hi: 'मामूली खरोंच' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 2,
    status: 'excluded',
    type: { en: 'Minor scuffs', te: 'చిన్న గీతలు / మరకలు', hi: 'मामूली निशान' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 3,
    status: 'excluded',
    type: { en: 'Dirt/stains', te: 'దుమ్ము / మరకలు', hi: 'धूल / दाग' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 4,
    status: 'excluded',
    type: { en: 'Normal wear and tear', te: 'సాధారణ అరుగుదల', hi: 'सामान्य टूट-फूट' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 5,
    status: 'excluded',
    type: { en: 'Pre-existing damage', te: 'ముందునుండే ఉన్న నష్టం', hi: 'पूर्व-मौजूदा क्षति' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 6,
    status: 'considered',
    type: { en: 'Damaged wheel', te: 'దెబ్బతిన్న చక్రం', hi: 'क्षतिग्रस्त पहिया' },
    treatment: { en: 'May be considered', te: 'పరిశీలించబడుతుంది', hi: 'विचार किया जा सकता है' }
  },
  {
    id: 7,
    status: 'considered',
    type: { en: 'Broken handle', te: 'విరిగిన హ్యాండిల్', hi: 'टूटा हुआ हैंडल' },
    treatment: { en: 'May be considered', te: 'పరిశీలించబడుతుంది', hi: 'विचार किया जा सकता है' }
  },
  {
    id: 8,
    status: 'considered',
    type: { en: 'Damaged zipper', te: 'పాడైన జిప్పర్', hi: 'खराब ज़िप' },
    treatment: { en: 'May be considered', te: 'పరిశీలించబడుతుంది', hi: 'विचार किया जा सकता है' }
  },
  {
    id: 9,
    status: 'considered',
    type: { en: 'Cracked shell', te: 'పగిలిన బాడీ / షెల్', hi: 'चटका हुआ शेल' },
    treatment: { en: 'May be considered', te: 'పరిశీలించబడుతుంది', hi: 'विचार किया जा सकता है' }
  },
  {
    id: 10,
    status: 'considered',
    type: { en: 'Major structural damage', te: 'భారీ నిర్మాణ నష్టం', hi: 'गंभीर संरचनात्मक क्षति' },
    treatment: { en: 'May be considered', te: 'పరిశీలించబడుతుంది', hi: 'विचार किया जा सकता है' }
  },
  {
    id: 11,
    status: 'excluded',
    type: { en: 'Intentional damage', te: 'ఉద్దేశపూర్వక నష్టం', hi: 'जानबूझकर की गई क्षति' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  },
  {
    id: 12,
    status: 'excluded',
    type: { en: 'Improper packaging damage', te: 'సరికాని ప్యాకింగ్ నష్టం', hi: 'अनुचित पैकिंग से क्षति' },
    treatment: { en: 'Generally excluded', te: 'సాధారణంగా మినహాయించబడింది', hi: 'सामान्यतः अपवर्जित' }
  },
  {
    id: 13,
    status: 'excluded',
    type: { en: 'Damage to excluded valuables', te: 'మినహాయించిన విలువైన వస్తువుల నష్టం', hi: 'बहिष्कृत कीमती सामान की क्षति' },
    treatment: { en: 'Not covered', te: 'వర్తించదు', hi: 'कवर नहीं है' }
  }
];

export const POLICY_SECTIONS_DEF = [
  {
    number: 1,
    title: { en: 'Product Overview', te: 'ఉత్పత్తి పరిచయం', hi: 'उत्पाद परिचय' },
    content: {
      en: 'ONECOOLIE Journey Protection is an optional journey-protection service associated with an eligible ONECOOLIE station assistance booking and eligible declared baggage. The customer price is ₹0.50 per journey. This product is currently in PRE-LAUNCH DEMONSTRATION phase and does not constitute an insurance policy or guarantee of payment.',
      te: 'వన్‌కూలీ జర్నీ ప్రొటెక్షన్ అనేది అర్హత కలిగిన వన్‌కూలీ స్టేషన్ సహాయక బుకింగ్ మరియు లగేజీతో కూడిన ఒక ఐచ్ఛిక ప్రొటెక్షన్ సేవ. కస్టమర్ ధర ఒక ప్రయాణానికి ₹0.50. ఈ ఉత్పత్తి ప్రస్తుతం ప్రీ-లాంచ్ డెమోన్స్ట్రేషన్ దశలో ఉంది మరియు బీమా పాలసీ లేదా చెల్లింపు హామీని అందించదు.',
      hi: 'वनकुली जर्नी प्रोटेक्शन एक वैकल्पिक यात्रा-सुरक्षा सेवा है जो पात्र वनकुली स्टेशन सहायता बुकिंग और पात्र घोषित सामान से जुड़ी है। ग्राहक शुल्क प्रति यात्रा ₹0.50 है। यह उत्पाद वर्तमान में प्री-लॉन्च प्रदर्शन चरण में है और कोई बीमा पॉलिसी या भुगतान की गारंटी नहीं देता है।'
    }
  },
  {
    number: 2,
    title: { en: 'Pre-launch Status', te: 'ప్రీ-లాంచ్ స్థితి', hi: 'प्री-लॉन्च स्थिति' },
    content: {
      en: 'ONECOOLIE Journey Protection is currently a pre-launch product demonstration and proposed protection service. It is not currently an insurance policy and does not constitute legally binding insurance coverage or a guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.',
      te: 'వన్‌కూలీ జర్నీ ప్రొటెక్షన్ ప్రస్తుతం ఒక ప్రీ-లాంచ్ ఉత్పత్తి డెమోన్స్ట్రేషన్ మరియు ప్రతిపాదిత రక్షణ సేవ మాత్రమే. ఇది ప్రస్తుతానికి బీమా పాలసీ కాదు మరియు చట్టబద్ధమైన బీమా కవరేజ్ లేదా చెల్లింపు హామీని కలిగి ఉండదు. అవసరమైన నియంత్రణ మరియు బీమా సంస్థ భాగస్వామ్యాలు పూర్తయిన తర్వాతే భవిష్యత్తులో బీమా సేవలు ప్రారంభమవుతాయి.',
      hi: 'वनकुली जर्नी प्रोटेक्शन वर्तमान में एक प्री-लॉन्च उत्पाद प्रदर्शन और प्रस्तावित सुरक्षा सेवा है। यह वर्तमान में बीमा पॉलिसी नहीं है और कानूनी रूप से बाध्यकारी बीमा कवरेज या भुगतान की गारंटी नहीं देता है। भविष्य में आवश्यक नियामक और बीमा प्रदाता व्यवस्था पूरी होने के बाद ही कोई वास्तविक बीमा उत्पाद पेश किया जाएगा।'
    }
  },
  {
    number: 3,
    title: { en: 'Eligibility', te: 'అర్హత నిబంధనలు', hi: 'पात्रता नियम' },
    content: {
      en: 'Protection is available to passengers holding a valid, confirmed ONECOOLIE station assistance booking for an eligible scheduled rail journey, who explicitly opt in and accept these versioned terms, and whose payment of ₹0.50 is server-verified (via online gateway or authorized cash collection). Protection is non-transferable and strictly bound to the authenticated passenger and booking.',
      te: 'షెడ్యూల్ చేసిన రైలు ప్రయాణానికి చెల్లుబాటు అయ్యే వన్‌కూలీ సహాయక బుకింగ్ కలిగి ఉండి, ఈ నిబంధనలను అంగీకరించి, సర్వర్ ద్వారా ₹0.50 చెల్లింపు నిర్ధారించబడిన ప్రయాణీకులకు మాత్రమే ప్రొటెక్షన్ వర్తిస్తుంది. ఇది బదిలీ చేయలేనిది మరియు బుకింగ్‌కు మాత్రమే పరిమితం.',
      hi: 'सुरक्षा केवल उन यात्रियों के लिए उपलब्ध है जिनके पास वैध वनकुली स्टेशन सहायता बुकिंग है, जिन्होंने इन शर्तों को स्वीकार किया है और जिनका ₹0.50 का भुगतान सर्वर द्वारा सत्यापित है। यह सुरक्षा अहस्तांतरणीय है।'
    }
  },
  {
    number: 4,
    title: { en: 'Protection Activation', te: 'ప్రొటెక్షన్ యాక్టివేషన్', hi: 'सुरक्षा सक्रियण' },
    content: {
      en: 'For online Razorpay bookings, protection activates immediately upon server-side cryptographic signature and amount verification. For CASH / COD bookings, protection is initialized as PENDING PAYMENT upon booking creation and activates only after authorized assistant cash collection is verified on the server. Selecting cash does not activate protection.',
      te: 'ఆన్‌లైన్ చెల్లింపుల కోసం, సర్వర్ వద్ద క్రిప్టోగ్రాఫిక్ సంతకం మరియు మొత్తం నిర్ధారించబడిన వెంటనే ప్రొటెక్షన్ యాక్టివేట్ అవుతుంది. క్యాష్ / COD బుకింగ్‌ల కోసం, అసిస్టెంట్ నగదు సేకరించి సర్వర్ నమోదు చేసిన తర్వాత మాత్రమే యాక్టివేట్ అవుతుంది. క్యాష్ ఎంచుకున్నంత మాత్రాన యాక్టివేట్ కాదు.',
      hi: 'ऑनलाइन रेज़रपे बुकिंग के लिए, भुगतान सत्यापन के बाद सुरक्षा तुरंत सक्रिय होती है। कैश / सीओडी बुकिंग के लिए, अधिकृत सहायक द्वारा नकद संग्रह दर्ज होने के बाद ही सुरक्षा सक्रिय होती है।'
    }
  },
  {
    number: 5,
    title: { en: 'Protection Period', te: 'రక్షణ వ్యవధి', hi: 'सुरक्षा अवधि' },
    content: {
      en: 'Protection applies strictly during the scheduled station assistance process associated with the booking, beginning when the assistant meets the passenger at the station and ending upon completion of the booked platform/coach transit service.',
      te: 'బుకింగ్‌కు సంబంధించిన స్టేషన్ సహాయక ప్రక్రియ సమయంలో మాత్రమే ప్రొటెక్షన్ వర్తిస్తుంది. అసిస్టెంట్ ప్రయాణీకుడిని కలుసుకున్నప్పటి నుండి ప్లాట్‌ఫారమ్ లేదా కోచ్ సేవ పూర్తయ్యే వరకు మాత్రమే రక్షణ అమల్లో ఉంటుంది.',
      hi: 'सुरक्षा केवल बुकिंग से जुड़ी स्टेशन सहायता प्रक्रिया के दौरान लागू होती है, जो सहायक द्वारा यात्री से मिलने पर शुरू होकर सेवा पूरी होने पर समाप्त होती है।'
    }
  },
  {
    number: 6,
    title: { en: 'Baggage Categories', te: 'లగేజీ వర్గాలు', hi: 'सामान की श्रेणियां' },
    content: {
      en: 'Eligible baggage is classified into four standard operational categories based on weight and container dimensions: Small Bag (up to 5 kg), Medium Bag (>5 kg to 15 kg), Large Bag (>15 kg to 25 kg), and Extra-Large Bag (>25 kg).',
      te: 'అర్హత కలిగిన లగేజీ బరువు ఆధారంగా నాలుగు కేటగిరీలుగా వర్గీకరించబడింది: చిన్న బ్యాగ్ (5 కేజీల వరకు), మధ్యస్థ బ్యాగ్ (>5 నుండి 15 కేజీలు), పెద్ద బ్యాగ్ (>15 నుండి 25 కేజీలు), మరియు అదనపు పెద్ద బ్యాగ్ (>25 కేజీలు).',
      hi: 'पात्र सामान को वजन के आधार पर चार श्रेणियों में वर्गीकृत किया गया है: छोटा बैग (5 किग्रा तक), मध्यम बैग (>5 से 15 किग्रा), बड़ा बैग (>15 से 25 किग्रा), और अतिरिक्त बड़ा बैग (>25 किग्रा)।'
    }
  },
  {
    number: 7,
    title: { en: 'Proposed Baggage Protection Limits', te: 'ప్రతిపాదిత లగేజీ రక్షణ పరిమితులు', hi: 'प्रस्तावित सामान सुरक्षा सीमाएँ' },
    content: {
      en: 'PROPOSED PRE-LAUNCH PROTECTION LIMITS: Small Bag (Up to 5 kg): Up to ₹2,500; Medium Bag (>5–15 kg): Up to ₹5,000; Large Bag (>15–25 kg): Up to ₹10,000; Extra-Large Bag (>25 kg): Up to ₹15,000. These limits are illustrative product terms for the current pre-launch demonstration and do not constitute active insurance coverage or a guaranteed payout. The proposed protection limit represents the maximum amount that may be considered under the applicable product terms. It does not represent an automatic payout or guaranteed reimbursement.',
      te: 'ప్రతిపాదిత ప్రీ-లాంచ్ ప్రొటెక్షన్ పరిమితులు: చిన్న బ్యాగ్ (5 కేజీల వరకు): గరిష్టంగా ₹2,500 వరకు; మధ్యస్థ బ్యాగ్ (>5–15 కేజీలు): గరిష్టంగా ₹5,000 వరకు; పెద్ద బ్యాగ్ (>15–25 కేజీలు): గరిష్టంగా ₹10,000 వరకు; అదనపు పెద్ద బ్యాగ్ (>25 కేజీలు): గరిష్టంగా ₹15,000 వరకు. ఇవి ప్రస్తుత ప్రీ-లాంచ్ ప్రదర్శన నిబంధనలు మాత్రమే మరియు హామీ ఇచ్చిన చెల్లింపు కాదు.',
      hi: 'प्रस्तावित सुरक्षा सीमाएँ: छोटा बैग (5 किग्रा तक): ₹2,500 तक; मध्यम बैग (>5–15 किग्रा): ₹5,000 तक; बड़ा बैग (>15–25 किग्रा): ₹10,000 तक; अतिरिक्त बड़ा बैग (>25 किग्रा): ₹15,000 तक। ये केवल सांकेतिक प्री-लॉन्च शर्तें हैं और कोई स्वचालित भुगतान की गारंटी नहीं देती हैं।'
    }
  },
  {
    number: 8,
    title: { en: 'Baggage Loss', te: 'లగేజీ నష్టం / పోవడం', hi: 'सामान का खोना' },
    content: {
      en: 'Baggage Loss Protection concerns eligible baggage that cannot be located after the applicable ONECOOLIE service process. A loss incident may be considered where there is a valid booking, active protection, eligible recorded baggage, verifiable occurrence during the service, timely passenger reporting, sufficient evidence, and no applicable exclusion. Loss claims are not automatically approved and remain subject to verification and approved final terms.',
      te: 'వన్‌కూలీ సేవా సమయంలో పోయిన అర్హత గల లగేజీని నష్ట నిబంధనల క్రింద పరిశీలించవచ్చు. చెల్లుబాటు అయ్యే బుకింగ్, యాక్టివ్ ప్రొటెక్షన్, సేవ సమయంలో జరిగినట్లు ఆధారాలు ఉన్నప్పుడు మాత్రమే పరిశీలించబడుతుంది. ఆటోమేటిక్ చెల్లింపులు ఏవీ ఉండవు.',
      hi: 'सेवा प्रक्रिया के दौरान खो जाने वाले पात्र सामान पर विचार किया जा सकता है। यह वैध बुकिंग, सक्रिय सुरक्षा और सत्यापन योग्य साक्ष्य पर निर्भर करता है। कोई स्वचालित दावा स्वीकृत नहीं होता है।'
    }
  },
  {
    number: 9,
    title: { en: 'Baggage Damage', te: 'లగేజీకి భౌతిక నష్టం', hi: 'सामान की क्षति' },
    content: {
      en: 'Baggage Damage Protection distinguishes genuine accidental physical damage from ordinary wear. Potentially considered damage includes broken suitcase shell, cracked hard-shell body, damaged wheel, detached wheel, broken handle, damaged telescopic handle, broken zipper caused by an eligible incident, damaged lock attached to baggage, and major structural deformation rendering baggage unusable. All damage claims are subject to verification.',
      te: 'సాధారణ అరుగుదలకు మరియు ప్రమాదవశాత్తు జరిగిన భౌతిక నష్టానికి వ్యత్యాసాన్ని పరిశీలిస్తారు. విరిగిన షెల్, విరిగిన చక్రం, విరిగిన హ్యాండిల్ లేదా జిప్పర్ వంటి నష్టాలు పరిశీలించబడతాయి. నష్ట పరిహారం ధృవీకరణకు లోబడి ఉంటుంది.',
      hi: 'सामान्य घिसाव और वास्तविक आकस्मिक क्षति के बीच अंतर किया जाता है। टूटा हुआ शेल, पहिया या हैंडल सत्यापन के अधीन विचारणीय हो सकते हैं।'
    }
  },
  {
    number: 10,
    title: { en: 'Damage Assessment', te: 'నష్టం తీవ్రత అంచనా', hi: 'क्षति मूल्यांकन' },
    content: {
      en: 'Damage is classified into three severity tiers: (1) Minor Damage (small scratches, superficial marks, minor scuffs, dirt, stains, cosmetic imperfections) — Not covered; (2) Moderate Damage (damaged wheel, broken handle, damaged zipper, functional non-structural damage) — May be considered subject to verification; (3) Major Damage (cracked shell, broken shell, major structural deformation, baggage rendered unusable) — May be considered subject to verification and applicable protection limit.',
      te: 'నష్టం మూడు వర్గాలుగా వర్గీకరించబడింది: (1) చిన్నపాటి నష్టం (చిన్న గీతలు, మరకలు, దుమ్ము) — వర్తించదు; (2) మధ్యస్థ నష్టం (దెబ్బతిన్న చక్రం, హ్యాండిల్, జిప్) — పరిశీలించబడుతుంది; (3) తీవ్రమైన నష్టం (పగిలిన బాడీ, విరిగిన షెల్) — పరిమితికి లోబడి పరిశీలించబడుతుంది.',
      hi: 'क्षति का वर्गीकरण: (1) मामूली क्षति (खरोंच, दाग) — कवर नहीं है; (2) मध्यम क्षति (पहिया, हैंडल, ज़िप) — विचारणीय; (3) गंभीर क्षति (टूटा शेल, अनुपयोगी बैग) — सीमा के अधीन विचारणीय।'
    }
  },
  {
    number: 11,
    title: { en: 'Valuable and Excluded Items', te: 'విలువైన మరియు మినహాయించిన వస్తువులు', hi: 'कीमती और बहिष्कृत सामान' },
    content: {
      en: 'VALUABLE ITEMS — PASSENGER RESPONSIBILITY: Passengers are responsible for keeping cash, currency, jewelry, gold, silver, precious metals, precious stones, passports, identity documents, credit/debit/bank cards, financial instruments, securities, important financial documents, laptops, tablets, mobile phones, cameras, expensive electronics, luxury watches, irreplaceable personal items, confidential documents, fragile valuables, and perishable goods with them. These items should not be placed inside checked or assisted baggage. ONECOOLIE is not responsible for loss, theft, disappearance, or damage to items that are excluded under the applicable Journey Protection terms. This statement describes proposed pre-launch product terms and does not constitute an active insurance exclusion.',
      te: 'విలువైన వస్తువులు — ప్రయాణీకుల బాధ్యత: నగదు, నగలు, బంగారం/వెండి, పాస్‌పోర్ట్, గుర్తింపు పత్రాలు, బ్యాంక్ కార్డులు, ల్యాప్‌టాప్‌లు, మొబైల్ ఫోన్లు, కెమెరాలు, ఖరీదైన ఎలక్ట్రానిక్స్ మరియు విలువైన పత్రాలను తమ వద్దే ఉంచుకోవడం ప్రయాణీకుల బాధ్యత. వీటిని అసిస్టెంట్‌కు ఇచ్చే లగేజీలో ఉంచరాదు. మినహాయించిన వస్తువుల నష్టానికి వన్‌కూలీ బాధ్యత వహించదు.',
      hi: 'कीमती सामान — यात्री की जिम्मेदारी: नकदी, गहने, सोना-चांदी, पासपोर्ट, पहचान पत्र, क्रेडिट/डेबिट कार्ड, लैपटॉप, मोबाइल फोन, कैमरे और कीमती सामान अपने पास रखना यात्री की जिम्मेदारी है। बहिष्कृत वस्तुओं के नुकसान के लिए वनकुली जिम्मेदार नहीं है।'
    }
  },
  {
    number: 12,
    title: { en: 'Prohibited/Restricted Items', te: 'నిషేధించబడిన వస్తువులు', hi: 'प्रतिबंधित वस्तुएं' },
    content: {
      en: 'PROHIBITED OR RESTRICTED ITEMS: Weapons, explosives, hazardous materials, flammable materials, illegal substances, stolen goods, prohibited chemicals, dangerous goods, and any items prohibited by Indian Railways or applicable law are strictly excluded. Passengers must comply with applicable railway, transport, safety, and legal requirements.',
      te: 'నిషేధిత వస్తువులు: ఆయుధాలు, పేలుడు పదార్థాలు, మండే పదార్థాలు, నిషేధిత రసాయనాలు, చట్టవిరుద్ధ వస్తువులు లేదా భారతీయ రైల్వే నియమాల ప్రకారం నిషేధించబడిన ఏవైనా వస్తువులు పూర్తిగా మినహాయించబడ్డాయి.',
      hi: 'प्रतिबंधित वस्तुएं: हथियार, विस्फोटक, ज्वलनशील पदार्थ, अवैध सामग्री या भारतीय रेलवे द्वारा प्रतिबंधित वस्तुएं पूर्णतः बहिष्कृत हैं। यात्रियों को रेलवे सुरक्षा नियमों का पालन करना अनिवार्य है।'
    }
  },
  {
    number: 13,
    title: { en: 'Pre-existing Damage', te: 'ముందునుండే ఉన్న నష్టం', hi: 'पूर्व-मौजूदा क्षति' },
    content: {
      en: 'Pre-existing damage is not intended to be covered. Existing cracks, pre-existing dents, previously damaged wheels, previously broken handles or zippers, and prior structural weakness are excluded. The condition of baggage may be observed and recorded upon acceptance.',
      te: 'ముందునుండే ఉన్న నష్టాలకు రక్షణ వర్తించదు. ఇప్పటికే ఉన్న గీతలు, పగుళ్లు, విరిగిన చక్రాలు లేదా మునుపటి బలహీనతలు మినహాయించబడ్డాయి.',
      hi: 'पूर्व-मौजूदा क्षति कवर नहीं है। पहले से मौजूद दरारें, टूटे पहिए या पहले की क्षति बहिष्कृत हैं।'
    }
  },
  {
    number: 14,
    title: { en: 'Normal Wear and Tear', te: 'సాధారణ అరుగుదల', hi: 'सामान्य टूट-फूट' },
    content: {
      en: 'Normal wear and tear is not covered. Ordinary surface scratches, minor scuffs, fabric fading, superficial stains, cosmetic deterioration, ordinary aging, minor zipper wear, and normal wheel tread wear resulting from regular transit use are excluded.',
      te: 'సాధారణ వినియోగం వల్ల కలిగే అరుగుదల వర్తించదు. చిన్న గీతలు, రంగు మారడం, ఉపరితల మరకలు మరియు చక్రాల సాధారణ అరుగుదల మినహాయించబడ్డాయి.',
      hi: 'सामान्य घिसाव कवर नहीं है। यात्रा के दौरान लगने वाली सामान्य खरोंचें, धूल, दाग या सामान्य टूट-फूट सुरक्षा में शामिल नहीं हैं।'
    }
  },
  {
    number: 15,
    title: { en: 'Packaging Responsibilities', te: 'ప్యాకింగ్ బాధ్యత', hi: 'पैकिंग की जिम्मेदारी' },
    content: {
      en: 'Passengers are responsible for properly securing fragile belongings and ensuring baggage is adequately closed and sealed. Proposed protection does not apply to damage caused solely by inadequate packaging, unzipped bags, overpacking, structural fatigue, or poor pre-existing condition.',
      te: 'సున్నితమైన వస్తువులను సరైన రీతిలో ప్యాక్ చేయడం మరియు జిప్‌లను సరిగ్గా మూసివేయడం ప్రయాణీకుల బాధ్యత. సరికాని ప్యాకింగ్ వల్ల కలిగే నష్టానికి రక్షణ వర్తించదు.',
      hi: 'सामान को ठीक से पैक करना और सुरक्षित बंद करना यात्री की जिम्मेदारी है। खराब पैकिंग से होने वाली क्षति कवर नहीं है।'
    }
  },
  {
    number: 16,
    title: { en: 'Passenger Responsibilities', te: 'ప్రయాణీకుల సాధారణ బాధ్యతలు', hi: 'यात्री की सामान्य जिम्मेदारियां' },
    content: {
      en: 'Passengers are responsible for accurately declaring baggage count and category during booking, keeping all valuable and fragile items on their person, inspecting baggage upon handoff, and reporting any incident promptly.',
      te: 'బుకింగ్ సమయంలో లగేజీ సంఖ్యను ఖచ్చితంగా ప్రకటించడం, విలువైన వస్తువులను తమ వద్దే ఉంచుకోవడం మరియు సేవ ముగిసిన వెంటనే లగేజీని తనిఖీ చేయడం ప్రయాణీకుడి బాధ్యత.',
      hi: 'बुकिंग के समय सामान की सही घोषणा करना, कीमती सामान अपने पास रखना और सेवा पूरी होने पर सामान की जांच करना यात्री की जिम्मेदारी है।'
    }
  },
  {
    number: 17,
    title: { en: 'Incident Reporting', te: 'సమస్య నివేదిక నమోదు', hi: 'घटना रिपोर्टिंग' },
    content: {
      en: 'Passengers should report baggage loss or damage as soon as reasonably possible after becoming aware of the incident. A report should include Protection ID, Booking ID, baggage reference, incident type (Loss, Damage, or Theft/Unaccounted), date, time, station location, full bag photograph, close-up photograph of damage, and passenger statement.',
      te: 'లగేజీ నష్టం లేదా పోయినట్లయితే ప్రయాణీకులు వీలైనంత త్వరగా నివేదించాలి. రిపోర్ట్‌లో ప్రొటెక్షన్ ID, బుకింగ్ ID, తేదీ, సమయం, స్టేషన్ మరియు నష్టపోయిన లగేజీ ఫోటోలు ఉండాలి.',
      hi: 'सामान खोने या क्षतिग्रस्त होने पर यात्रियों को शीघ्र रिपोर्ट करनी चाहिए। इसमें प्रोटेक्शन आईडी, फोटो और विवरण शामिल होना चाहिए।'
    }
  },
  {
    number: 18,
    title: { en: 'Evidence Requirements', te: 'ఆధారాల అవసరాలు', hi: 'साक्ष्य आवश्यकताएं' },
    content: {
      en: 'Future assessment of reported incidents may require the booking record, Protection ID, acceptance record, service telemetry, assistant verification notes, photographic evidence, and proof of ownership. Unsubstantiated or unverified reports are not eligible.',
      te: 'నివేదించబడిన సంఘటనల పరిశీలనకు బుకింగ్ రికార్డు, ఫోటో సాక్ష్యాలు మరియు అసిస్టెంట్ నోట్స్ అవసరమవుతాయి. ఆధారాలు లేని నివేదికలు ఆమోదించబడవు.',
      hi: 'रिपोर्ट किए गए मामलों के मूल्यांकन के लिए बुकिंग रिकॉर्ड, फोटो और सहायक के नोट्स आवश्यक होंगे।'
    }
  },
  {
    number: 19,
    title: { en: 'Proposed Claim Process', te: 'ప్రతిపాదిత క్లెయిమ్ విధానం', hi: 'प्रस्तावित दावा प्रक्रिया' },
    content: {
      en: 'In the future authorized insurance provider model: Protection Active → Incident Occurs → Passenger Reports Loss/Damage with Evidence → ONECOOLIE Verifies Booking & Assistant Telemetry → Eligibility & Exclusions Checked → Future Authorized Provider Review → Determination. In the current pre-launch phase, no real claim adjudication or payout takes place.',
      te: 'భవిష్యత్తు బీమా ప్రొవైడర్ మోడల్: ప్రొటెక్షన్ యాక్టివ్ → సంఘటన → సాక్ష్యాలతో నివేదిక → వన్‌కూలీ ధృవీకరణ → బీమా సంస్థ సమీక్ష → తుది నిర్ణయం. ప్రస్తుత ప్రీ-లాంచ్ దశలో నిజమైన క్లెయిమ్ చెల్లింపులు ఏవీ జరగవు.',
      hi: 'भविष्य की दावा प्रक्रिया: सुरक्षा सक्रिय → घटना → साक्ष्य सहित रिपोर्ट → सत्यापन → प्रदाता समीक्षा → निर्णय। वर्तमान प्री-लॉन्च में कोई वास्तविक भुगतान नहीं होता है।'
    }
  },
  {
    number: 20,
    title: { en: 'Repair/Replacement', te: 'మరమ్మతు లేదా మార్పిడి', hi: 'मरम्मत या प्रतिस्थापन' },
    content: {
      en: 'Where damage is eventually determined eligible under future approved terms, resolution may take the form of authorized repair, replacement, or approved settlement up to the applicable bag protection limit. Cash payout or full replacement is not guaranteed.',
      te: 'భవిష్యత్తు ఆమోదిత నిబంధనల ప్రకారం నష్టం అర్హత పొందితే, మరమ్మతు లేదా వర్తించే పరిమితి వరకు మార్పిడి రూపంలో పరిష్కారం ఉండవచ్చు. పూర్తి నగదు పరిహారానికి హామీ లేదు.',
      hi: 'स्वीकृत दावों के लिए मरम्मत या लागू सीमा तक प्रतिस्थापन हो सकता है। नकद भुगतान की गारंटी नहीं है।'
    }
  },
  {
    number: 21,
    title: { en: 'Cancellation and Refund', te: 'రద్దు మరియు రీఫండ్', hi: 'रद्दीकरण और रिफंड' },
    content: {
      en: 'If an associated ONECOOLIE booking is cancelled prior to service commencement in accordance with the Cancellation Policy, the ₹0.50 protection fee is 100% refundable via the original payment method. For cash bookings cancelled before collection, the protection is cancelled without surcharge. Once a service is in progress or completed, the protection fee is non-refundable.',
      te: 'సేవ ప్రారంభం కావడానికి ముందు బుకింగ్ రద్దు చేయబడితే, ₹0.50 ప్రొటెక్షన్ రుసుము 100% రీఫండ్ చేయబడుతుంది. సేవ ప్రారంభమైన తర్వాత ప్రొటెక్షన్ రుసుము రీఫండ్ చేయబడదు.',
      hi: 'सेवा शुरू होने से पहले बुकिंग रद्द होने पर ₹0.50 का सुरक्षा शुल्क 100% वापस किया जाता है। सेवा शुरू होने के बाद यह वापस नहीं होगा।'
    }
  },
  {
    number: 22,
    title: { en: 'Terms Acceptance', te: 'నిబంధనల అంగీకారం', hi: 'शर्तों की स्वीकृति' },
    content: {
      en: 'By selecting Journey Protection, the passenger explicitly confirms having read, understood, and accepted these pre-launch product terms. Acceptance is authoritatively logged with user ID, booking ID, Protection ID, timestamp, and version string ONECOOLIE-PROTECTION-PRELAUNCH-v2.',
      te: 'జర్నీ ప్రొటెక్షన్‌ను ఎంచుకోవడం ద్వారా ప్రయాణీకుడు ఈ ప్రీ-లాంచ్ నిబంధనలను చదివి అంగీకరించినట్లు ధృవీకరిస్తారు. అంగీకారం యూజర్ ID, బుకింగ్ ID మరియు టైమ్‌స్టాంప్‌తో నమోదు చేయబడుతుంది.',
      hi: 'जर्नी प्रोटेक्शन चुनकर यात्री इन प्री-लॉन्च शर्तों को स्वीकार करता है। यह स्वीकृति सिस्टम में टाइमस्टैम्प के साथ दर्ज की जाती है।'
    }
  },
  {
    number: 23,
    title: { en: 'Policy Version', te: 'పాలసీ వెర్షన్', hi: 'पॉलिसी संस्करण' },
    content: {
      en: 'This policy is version ONECOOLIE-PROTECTION-PRELAUNCH-v2 (effective October 2026). Historical protection records retain the exact terms version accepted at purchase and are not retroactively modified.',
      te: 'ఈ పాలసీ వెర్షన్ ONECOOLIE-PROTECTION-PRELAUNCH-v2 (అక్టోబర్ 2026 నుండి అమల్లోకి వచ్చింది). గత రికార్డులు వాటి అసలు వెర్షన్‌ను కలిగి ఉంటాయి.',
      hi: 'यह पॉलिसी संस्करण ONECOOLIE-PROTECTION-PRELAUNCH-v2 है। पुराने रिकॉर्ड अपने मूल संस्करण को बनाए रखते हैं।'
    }
  },
  {
    number: 24,
    title: { en: 'Future Provider Integration', te: 'భవిష్యత్తు బీమా ప్రొవైడర్ భాగస్వామ్యం', hi: 'भविष्य का बीमा प्रदाता एकीकरण' },
    content: {
      en: 'ONECOOLIE is a technology platform and not an insurance company. Legitimate insurance coverage will be underwritten solely by an authorized, IRDAI-registered insurance partner once formal regulatory and commercial agreements are finalized. Provider fields in this version remain null.',
      te: 'వన్‌కూలీ ఒక టెక్నాలజీ ప్లాట్‌ఫారమ్ మరియు బీమా సంస్థ కాదు. భవిష్యత్తులో IRDAI నమోదిత బీమా భాగస్వామితో అధికారిక ఒప్పందం కుదిరిన తర్వాతే బీమా వర్తిస్తుంది. ప్రస్తుతానికి ప్రొవైడర్ ఫీల్డ్‌లు ఖాళీగా ఉంటాయి.',
      hi: 'वनकुली एक प्रौद्योगिकी मंच है, बीमा कंपनी नहीं। वैध बीमा केवल IRDAI पंजीकृत अधिकृत बीमा प्रदाता द्वारा ही प्रदान किया जाएगा।'
    }
  },
  {
    number: 25,
    title: { en: 'Important Disclaimer', te: 'ముఖ్యమైన హెచ్చరిక & నిరాకరణ', hi: 'महत्वपूर्ण अस्वीकरण' },
    content: {
      en: 'This feature is currently a pre-launch product demonstration and proposed protection service. It does not constitute an insurance policy, certificate of insurance, or guarantee of financial reimbursement. Neither ONECOOLIE nor its operating entities shall be liable for claims or financial compensation under this pre-launch concept demonstration.',
      te: 'ఈ ఫీచర్ ప్రస్తుతం ప్రీ-లాంచ్ డెమోన్స్ట్రేషన్ మాత్రమే. ఇది బీమా పాలసీ లేదా పరిహార హామీ కాదు. ఈ డెమోన్స్ట్రేషన్ ఆధారంగా ఎటువంటి ఆర్థిక పరిహారానికి వన్‌కూలీ బాధ్యత వహించదు.',
      hi: 'यह सुविधा केवल प्री-लॉन्च उत्पाद प्रदर्शन है। यह कोई बीमा पॉलिसी या वित्तीय प्रतिपूर्ति की गारंटी नहीं है।'
    }
  }
];

export function getLocalizedPolicy(lang = 'en') {
  const currentLang = ['en', 'te', 'hi'].includes(lang) ? lang : 'en';

  return {
    version: 'ONECOOLIE-PROTECTION-PRELAUNCH-v2',
    price: '₹0.50',
    tiers: BAGGAGE_PROTECTION_LIMITS_DEF.map(t => ({
      tier: t.tier,
      label: t.labels[currentLang] || t.labels.en,
      weightRange: t.weightRange,
      limitStr: t.limitStr,
      description: t.descriptions[currentLang] || t.descriptions.en
    })),
    damageTable: DAMAGE_TERMS_DEF.map(d => ({
      id: d.id,
      status: d.status,
      damageType: d.type[currentLang] || d.type.en,
      treatment: d.treatment[currentLang] || d.treatment.en
    })),
    sections: POLICY_SECTIONS_DEF.map(s => ({
      number: s.number,
      title: s.title[currentLang] || s.title.en,
      content: s.content[currentLang] || s.content.en
    }))
  };
}
