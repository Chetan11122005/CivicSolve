import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      navbar: {
        discover: "Discover",
        dashboard: "Dashboard",
        login: "Log In",
        signup: "Sign Up",
        logout: "Logout",
        postChallenge: "Post Challenge"
      },
      hero: {
        titleLine1: "Where real problems",
        titleLine2: "meet real solvers.",
        subtitle: "A collaborative platform bridging the gap between citizens facing societal challenges and the university teams and industry experts ready to solve them.",
        postChallengeBtn: "Post a Challenge",
        exploreBtn: "Explore Challenges"
      },
      stats: {
        posted: "Challenges Posted",
        solved: "Challenges Solved",
        institutions: "Institutions",
        industry: "Industry Partners"
      },
      howItWorks: {
        title: "How CivicSolve Works",
        subtitle: "A seamless pipeline turning community complaints into funded reality.",
        step1Title: "1. Report (Citizen)",
        step1Desc: "Citizens geo-tag local issues. Our AI instantly categorizes the problem and extracts key data to alert the right experts.",
        step2Title: "2. Adopt (University)",
        step2Desc: "University students discover challenges, form teams, and use the platform to collaborate and post live prototype updates.",
        step3Title: "3. Verify & Fund (Industry)",
        step3Desc: "Once verified, winning solutions are showcased to industry partners who can contact the team for grants or deployment."
      },
      bento: {
        title: "Powered by Next-Gen Tech",
        subtitle: "Built from the ground up to eliminate friction and accelerate innovation.",
        aiTitle: "Google Gemini AI Integration",
        aiDesc: "Our Auto-Categorization engine uses LLMs to read unstructured citizen complaints and instantly extract severity, location, and metadata.",
        liveTitle: "Live Progress Tracking",
        liveDesc: "Teams post real-time updates directly to a public timeline, ensuring complete transparency.",
        geoTitle: "Geo-Discovery & Maps",
        geoDesc: "Filter and search for hyper-local problems in your exact neighborhood or view them on an interactive map.",
        verifyTitle: "Frictionless Verification",
        verifyDesc: "Once a solution is submitted, it undergoes a community verification process before it is showcased to investors."
      },
      successStories: {
        title: "Success Stories",
        subtitle: "Real-world impact created by collaborative teams across the nation.",
        verified: "Verified",
        theSolution: "The Solution:",
        readCaseStudy: "Read full case study",
        loading: "Loading success stories...",
        empty: "Check back soon for featured success stories!"
      },
      cta: {
        title: "Ready to impact your city?",
        subtitle: "Join thousands of citizens, students, and companies working together to build better communities.",
        joinBtn: "Join CivicSolve Today"
      },
      footer: {
        citizen: "Sign up as a Citizen",
        university: "Join as a University",
        industry: "Partner as Industry",
        rights: "© 2026 CivicSolve. All rights reserved."
      },
      postChallenge: {
        heading: "Post a Civic Challenge",
        subheading: "Describe the problem in your community so solvers can help.",
        title: "Title",
        titlePlaceholder: "e.g., Potholes on Main Street",
        description: "Description",
        descPlaceholder: "Describe the issue, its impact, and what kind of solution you're looking for...",
        aiAssist: "Auto-Categorize with AI",
        aiAnalyzing: "Analyzing...",
        category: "Category",
        severity: "Severity",
        location: "Location",
        locationPlaceholder: "e.g., Downtown District, City Name",
        autoDetect: "Auto-Detect Location",
        detecting: "Detecting GPS...",
        upload: "Upload Image (Optional)",
        uploadPrompt: "Upload a file",
        orDrag: "or drag and drop",
        fileTypes: "PNG, JPG, GIF up to 5MB",
        submit: "Submit Challenge",
        submitting: "Posting...",
        successTitle: "Challenge Posted!",
        successDesc: "It is now pending admin approval. Redirecting..."
      },
      discover: {
        title: "Discover Challenges",
        searchPlaceholder: "Search challenges by title, location...",
        sortBy: "Sort By",
        newest: "Newest",
        mostUpvoted: "Most Upvoted",
        status: "Status",
        allStatuses: "All Statuses",
        severity: "Severity",
        allSeverities: "All Severities",
        categories: "Categories",
        gridView: "Grid View",
        mapView: "Map View",
        viewChallenge: "View",
        noChallenges: "No challenges found matching your filters.",
        upvotes: "Upvotes",
        high: "High",
        medium: "Medium",
        low: "Low",
        open: "Open",
        in_progress: "In Progress",
        solution_submitted: "Solution Submitted",
        solved: "Solved",
        pending_approval: "Pending Approval"
      },
      categories: {
        water: "Water",
        health: "Health",
        education: "Education",
        infrastructure: "Infrastructure",
        environment: "Environment",
        safety: "Safety",
        other: "Other"
      },
      auth: {
        signInWithGoogle: "Sign in with Google",
        signUpWithGoogle: "Sign up with Google",
        connectingGoogle: "Connecting to Google...",
        orContinueWithEmail: "Or continue with email",
        welcomeBack: "Welcome back",
        createAccount: "Create an account",
        signInDesc: "Please sign in to your account.",
        signUpDesc: "Join CivicSolve to start making an impact.",
        fullName: "Full Name",
        fullNamePlaceholder: "Jane Doe",
        emailAddress: "Email address",
        emailPlaceholder: "you@example.com",
        password: "Password",
        role: "Role",
        institutionName: "Institution Name",
        institutionPlaceholder: "e.g. State University or Tech Corp",
        signInBtn: "Sign in",
        createAccountBtn: "Create account",
        processing: "Processing...",
        noAccount: "Don't have an account? Sign up",
        haveAccount: "Already have an account? Sign in",
        citizenRole: "Citizen (Post Challenges)",
        universityRole: "University (Solve Challenges)",
        industryRole: "Industry (Sponsor & Solve)",
        collaborateTitle: "Collaborate",
        collaborateDesc: "Join forces with citizens, universities, and industry.",
        innovateTitle: "Innovate",
        innovateDesc: "Develop solutions that matter to the real world.",
        verifyTitle: "Verify",
        verifyDesc: "Deploy and verify solutions directly in the community."
      }
    }
  },
  hi: {
    translation: {
      navbar: {
        discover: "खोजें (Discover)",
        dashboard: "डैशबोर्ड",
        login: "लॉग इन",
        signup: "साइन अप",
        logout: "लॉग आउट",
        postChallenge: "समस्या दर्ज करें"
      },
      hero: {
        titleLine1: "जहाँ वास्तविक समस्याएं",
        titleLine2: "समाधानकर्ताओं से मिलती हैं।",
        subtitle: "नागरिकों और उनके समाधान के लिए तैयार विश्वविद्यालय टीमों और उद्योग विशेषज्ञों के बीच की दूरी को पाटने वाला एक सहयोगी मंच।",
        postChallengeBtn: "समस्या दर्ज करें",
        exploreBtn: "समस्याएं देखें"
      },
      stats: {
        posted: "दर्ज की गई समस्याएं",
        solved: "हल की गई समस्याएं",
        institutions: "संबद्ध संस्थान",
        industry: "उद्योग भागीदार"
      },
      howItWorks: {
        title: "सिविकसॉल्व कैसे काम करता है",
        subtitle: "समुदाय की समस्याओं को समर्थित वास्तविकता में बदलने की प्रक्रिया।",
        step1Title: "1. रिपोर्ट करें (नागरिक)",
        step1Desc: "नागरिक स्थानीय समस्याओं को जियो-टैग करते हैं। हमारा AI तुरंत समस्या को वर्गीकृत करता है।",
        step2Title: "2. अपनाएं (विश्वविद्यालय)",
        step2Desc: "छात्र चुनौतियों को खोजते हैं, टीमें बनाते हैं और लाइव प्रोटोटाइप अपडेट साझा करते हैं।",
        step3Title: "3. सत्यापित और फंड (उद्योग)",
        step3Desc: "सत्यापन के बाद, विजेता समाधानों को उद्योग भागीदारों के सामने प्रस्तुत किया जाता है।"
      },
      bento: {
        title: "अत्याधुनिक तकनीक द्वारा संचालित",
        subtitle: "समस्या निवारण को सुगम और त्वरित बनाने के लिए निर्मित।",
        aiTitle: "Google Gemini AI एकीकरण",
        aiDesc: "हमारा ऑटो-वर्गीकरण इंजन नागरिक शिकायतों को पढ़कर गंभीरता, स्थान और विवरण तुरंत पहचानता है।",
        liveTitle: "लाइव प्रगति ट्रैकिंग",
        liveDesc: "टीमें सार्वजनिक समयरेखा पर सीधे रीयल-टाइम अपडेट पोस्ट करती हैं, जिससे पूर्ण पारदर्शिता बनी रहती है।",
        geoTitle: "जियो-डिस्कवरी और मानचित्र",
        geoDesc: "अपने क्षेत्र की समस्याओं को फ़िल्टर करें या उन्हें सीधे इंटरैक्टिव मैप पर देखें।",
        verifyTitle: "सरल सत्यापन",
        verifyDesc: "समाधान प्रस्तुत होने के बाद, निवेशकों के सामने प्रदर्शित करने से पहले उसका सामुदायिक सत्यापन होता है।"
      },
      successStories: {
        title: "सफलता की कहानियां",
        subtitle: "देश भर की टीमों द्वारा बनाया गया वास्तविक प्रभाव।",
        verified: "सत्यापित",
        theSolution: "समाधान:",
        readCaseStudy: "पूरा केस स्टडी पढ़ें",
        loading: "कहानियां लोड हो रही हैं...",
        empty: "जल्द ही और कहानियां जोड़ी जाएंगी!"
      },
      cta: {
        title: "अपने शहर को बेहतर बनाने के लिए तैयार हैं?",
        subtitle: "बेहतर समाज के निर्माण के लिए नागरिकों, छात्रों और कंपनियों के साथ जुड़ें।",
        joinBtn: "आज ही सिविकसॉल्व से जुड़ें"
      },
      footer: {
        citizen: "नागरिक के रूप में जुड़ें",
        university: "विश्वविद्यालय के रूप में जुड़ें",
        industry: "उद्योग भागीदार बनें",
        rights: "© 2026 CivicSolve. सर्वाधिकार सुरक्षित।"
      },
      postChallenge: {
        heading: "नागरिक समस्या दर्ज करें",
        subheading: "अपने समुदाय की समस्या का वर्णन करें ताकि समाधानकर्ता मदद कर सकें।",
        title: "शीर्षक",
        titlePlaceholder: "उदा. मुख्य सड़क पर गड्ढे",
        description: "विवरण",
        descPlaceholder: "समस्या, उसके प्रभाव और अपेक्षित समाधान का वर्णन करें...",
        aiAssist: "AI द्वारा स्वतः वर्गीकृत करें",
        aiAnalyzing: "विश्लेषण जारी है...",
        category: "श्रेणी",
        severity: "गंभीरता",
        location: "स्थान",
        locationPlaceholder: "उदा. सेक्टर 4, नई दिल्ली",
        autoDetect: "स्थान का स्वतः पता लगाएं",
        detecting: "GPS द्वारा खोज रहे हैं...",
        upload: "तस्वीर अपलोड करें (वैकल्पिक)",
        uploadPrompt: "फ़ाइल चुनें",
        orDrag: "या खींचकर छोड़ें",
        fileTypes: "PNG, JPG, GIF अधिकतम 5MB",
        submit: "समस्या सबमिट करें",
        submitting: "दर्ज हो रहा है...",
        successTitle: "समस्या दर्ज कर दी गई!",
        successDesc: "यह अब व्यवस्थापक अनुमोदन के लिए लंबित है। रीडायरेक्ट कर रहे हैं..."
      },
      discover: {
        title: "समस्याएं खोजें",
        searchPlaceholder: "शीर्षक या स्थान के आधार पर खोजें...",
        sortBy: "क्रमबद्ध करें",
        newest: "नवीनतम",
        mostUpvoted: "सर्वाधिक वोट",
        status: "स्थिति",
        allStatuses: "सभी स्थितियां",
        severity: "गंभीरता",
        allSeverities: "सभी स्तर",
        categories: "श्रेणियां",
        gridView: "ग्रिड व्यू",
        mapView: "मानचित्र दृश्य (Map View)",
        viewChallenge: "देखें",
        noChallenges: "फ़िल्टर के अनुसार कोई समस्या नहीं मिली।",
        upvotes: "वोट",
        high: "उच्च",
        medium: "मध्यम",
        low: "कम",
        open: "खुला है",
        in_progress: "प्रगति पर है",
        solution_submitted: "समाधान प्रस्तुत",
        solved: "हल किया गया",
        pending_approval: "अनुमोदन लंबित"
      },
      categories: {
        water: "जल",
        health: "स्वास्थ्य",
        education: "शिक्षा",
        infrastructure: "बुनियादी ढांचा",
        environment: "पर्यावरण",
        safety: "सुरक्षा",
        other: "अन्य"
      },
      auth: {
        signInWithGoogle: "Google के साथ साइन इन करें",
        signUpWithGoogle: "Google के साथ साइन अप करें",
        connectingGoogle: "Google से कनेक्ट हो रहा है...",
        orContinueWithEmail: "या ईमेल के साथ जारी रखें",
        welcomeBack: "वापसी पर स्वागत है",
        createAccount: "खाता बनाएं",
        signInDesc: "कृपया अपने खाते में साइन इन करें।",
        signUpDesc: "सकारात्मक बदलाव लाने के लिए CivicSolve से जुड़ें।",
        fullName: "पूरा नाम",
        fullNamePlaceholder: "उदा. राहुल शर्मा",
        emailAddress: "ईमेल पता",
        emailPlaceholder: "you@example.com",
        password: "पासवर्ड",
        role: "भूमिका (Role)",
        institutionName: "संस्थान का नाम",
        institutionPlaceholder: "उदा. राज्य विश्वविद्यालय या टेक कॉर्प",
        signInBtn: "साइन इन",
        createAccountBtn: "खाता बनाएं",
        processing: "प्रक्रिया जारी है...",
        noAccount: "खाता नहीं है? साइन अप करें",
        haveAccount: "पहले से खाता है? साइन इन करें",
        citizenRole: "नागरिक (समस्या दर्ज करें)",
        universityRole: "विश्वविद्यालय (समस्या हल करें)",
        industryRole: "उद्योग (प्रायोजक व समाधान)",
        collaborateTitle: "सहयोग करें",
        collaborateDesc: "नागरिकों, विश्वविद्यालयों और उद्योग के साथ मिलकर काम करें।",
        innovateTitle: "नवाचार करें",
        innovateDesc: "वास्तविक दुनिया के लिए सार्थक समाधान विकसित करें।",
        verifyTitle: "सत्यापित करें",
        verifyDesc: "समुदाय में सीधे समाधान लागू करें और सत्यापित करें।"
      }
    }
  },
  ta: {
    translation: {
      navbar: {
        discover: "கண்டுபிடி (Discover)",
        dashboard: "டாஷ்போர்டு",
        login: "உள்நுழை",
        signup: "பதிவு செய்க",
        logout: "வெளியேறு",
        postChallenge: "சிக்கலை பதிவிடுக"
      },
      hero: {
        titleLine1: "உண்மையான பிரச்சினைகள்",
        titleLine2: "தீர்வாளர்களை சந்திக்கும் இடம்.",
        subtitle: "சமூக சவால்களை எதிர்கொள்ளும் குடிமக்களையும், அவற்றுக்கு தீர்வு காணத் தயாராக உள்ள பல்கலைக்கழக அணிகளையும் இணைக்கும் தளம்.",
        postChallengeBtn: "சிக்கலை பதிவு செய்க",
        exploreBtn: "சிக்கல்களை ஆராய்க"
      },
      stats: {
        posted: "பதிவு செய்யப்பட்ட பிரச்சினைகள்",
        solved: "தீர்க்கப்பட்ட பிரச்சினைகள்",
        institutions: "பங்கேற்கும் கல்வி நிறுவனங்கள்",
        industry: "தொழில்துறை கூட்டாளர்கள்"
      },
      howItWorks: {
        title: "CivicSolve எவ்வாறு செயல்படுகிறது",
        subtitle: "சமூக புகார்களை நிதி உதவிபெற்ற தீர்வுகளாக மாற்றும் எளிய வழிமுறை.",
        step1Title: "1. புகார் செய்க (குடிமகன்)",
        step1Desc: "குடிமக்கள் உள்ளூர் பிரச்சினைகளை ஜியோ-டேக் செய்கிறார்கள். எங்கள் AI தானாகவே அதை வகைப்படுத்துகிறது.",
        step2Title: "2. ஏற்கவும் (பல்கலைக்கழகம்)",
        step2Desc: "மாணவர்கள் சவால்களைக் கண்டுபிடித்து, அணிகளை உருவாக்கி, முன்மாதிரி புதுப்பிப்புகளைப் பகிர்கின்றனர்.",
        step3Title: "3. சரிபார்த்து நிதி பெறுக (தொழில்துறை)",
        step3Desc: "சரிபார்க்கப்பட்ட பின்னர், சிறந்த தீர்வுகள் தொழில்துறை கூட்டாளர்களுக்கு வழங்கப்படுகின்றன."
      },
      bento: {
        title: "நவீன தொழில்நுட்பத்தால் இயக்கப்படுகிறது",
        subtitle: "புதுமைகளை விரைவுபடுத்த வடிவமைக்கப்பட்டுள்ளது.",
        aiTitle: "Google Gemini AI ஒருங்கிணைப்பு",
        aiDesc: "புகார்களைப் படித்து முக்கியத்துவத்தையும் இருப்பிடத்தையும் நொடிகளில் பிரித்தெடுக்கிறது.",
        liveTitle: "நேரலை முன்னேற்ற கண்காணிப்பு",
        liveDesc: "முழு வெளிப்படைத்தன்மையுடன் அணிகள் தங்கள் முன்னேற்றத்தை நேரடியாகப் பகிர்கின்றன.",
        geoTitle: "வரைபட தேடல் (Maps)",
        geoDesc: "உங்கள் பகுதியில் உள்ள பிரச்சினைகளை ஊடாடும் வரைபடத்தில் காண்க.",
        verifyTitle: "சரிபார்ப்பு முறை",
        verifyDesc: "சமர்ப்பிக்கப்பட்ட தீர்வுகள் பொதுமக்களால் சரிபார்க்கப்பட்டு முதலீட்டாளர்களுக்கு காட்டப்படும்."
      },
      successStories: {
        title: "வெற்றிக் கதைகள்",
        subtitle: "நாடு முழுவதும் உள்ள அணிகளால் உருவாக்கப்பட்ட உண்மையான தாக்கம்.",
        verified: "சரிபார்க்கப்பட்டது",
        theSolution: "தீர்வு:",
        readCaseStudy: "முழு ஆய்வை வாசிக்க",
        loading: "ஏற்றப்படுகிறது...",
        empty: "விரைவில் வெற்றிக் கதைகள் பகிரப்படும்!"
      },
      cta: {
        title: "உங்கள் நகரத்தை மாற்ற தயாரா?",
        subtitle: "சிறந்த சமூகத்தை உருவாக்க குடிமக்கள் மற்றும் மாணவர்களுடன் இணையுங்கள்.",
        joinBtn: "இன்றே CivicSolve இல் சேருங்கள்"
      },
      footer: {
        citizen: "குடிமகனாக இணையுங்கள்",
        university: "பல்கலைக்கழகமாக இணையுங்கள்",
        industry: "தொழில்துறை கூட்டாளராகுங்கள்",
        rights: "© 2026 CivicSolve. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை."
      },
      postChallenge: {
        heading: "குடிமைச் சவாலை பதிவு செய்க",
        subheading: "தீர்வாளர்கள் உதவ உங்கள் சமூகத்தின் பிரச்சினையை விவரிக்கவும்.",
        title: "தலைப்பு",
        titlePlaceholder: "எ.கா., பிரதான சாலையில் குழிகள்",
        description: "விளக்கம்",
        descPlaceholder: "பிரச்சினை மற்றும் அதன் தாக்கத்தை விவரிக்கவும்...",
        aiAssist: "AI மூலம் வகைப்படுத்துக",
        aiAnalyzing: "ஆராய்கிறது...",
        category: "வகை",
        severity: "தீவிரம்",
        location: "இடம்",
        locationPlaceholder: "எ.கா., அண்ணா நகர், சென்னை",
        autoDetect: "இருப்பிடத்தை தானாக கண்டறிக",
        detecting: "GPS தேடுகிறது...",
        upload: "படத்தை பதிவேற்றவும் (விருப்பத்தேர்வு)",
        uploadPrompt: "கோப்பைத் தேர்ந்தெடுக்கவும்",
        orDrag: "அல்லது இழுத்து விடவும்",
        fileTypes: "PNG, JPG, GIF (அதிகபட்சம் 5MB)",
        submit: "சவாலை சமர்ப்பிக்கவும்",
        submitting: "பதிவேற்றுகிறது...",
        successTitle: "சவால் பதிவிடப்பட்டது!",
        successDesc: "இது தற்போது நிர்வாகியின் ஒப்புதலுக்கு காத்திருக்கிறது..."
      },
      discover: {
        title: "சவால்களை ஆராயுங்கள்",
        searchPlaceholder: "தலைப்பு அல்லது இருப்பிடத்தின் மூலம் தேடுங்கள்...",
        sortBy: "வரிசைப்படுத்து",
        newest: "புதியவை",
        mostUpvoted: "அதிக வாக்குகள்",
        status: "நிலை",
        allStatuses: "அனைத்து நிலைகளும்",
        severity: "தீவிரம்",
        allSeverities: "அனைத்து தீவிரமும்",
        categories: "வகைகள்",
        gridView: "கட்டம் பார்வை (Grid)",
        mapView: "வரைபட பார்வை (Map)",
        viewChallenge: "காண்க",
        noChallenges: "சவால்கள் எதுவும் கிடைக்கவில்லை.",
        upvotes: "வாக்குகள்",
        high: "அதிகம்",
        medium: "நடுத்தரம்",
        low: "குறைவு",
        open: "திறந்துள்ளது",
        in_progress: "செயல்பாட்டில் உள்ளது",
        solution_submitted: "தீர்வு சமர்ப்பிக்கப்பட்டது",
        solved: "தீர்க்கப்பட்டது",
        pending_approval: "ஒப்புதலுக்கு காத்திருக்கிறது"
      },
      categories: {
        water: "நீர்",
        health: "சுகாதாரம்",
        education: "கல்வி",
        infrastructure: "உள்கட்டமைப்பு",
        environment: "சுற்றுச்சூழல்",
        safety: "பாதுகாப்பு",
        other: "பிற"
      },
      auth: {
        signInWithGoogle: "Google உடன் உள்நுழைக",
        signUpWithGoogle: "Google உடன் பதிவு செய்க",
        connectingGoogle: "Google உடன் இணைக்கிறது...",
        orContinueWithEmail: "அல்லது மின்னஞ்சல் மூலம் தொடரவும்",
        welcomeBack: "மீண்டும் வருக",
        createAccount: "கணக்கை உருவாக்கவும்",
        signInDesc: "உங்கள் கணக்கில் உள்நுழைக.",
        signUpDesc: "மாற்றத்தை உருவாக்க CivicSolve இல் இணையுங்கள்.",
        fullName: "முழு பெயர்",
        fullNamePlaceholder: "எ.கா. கார்த்திக்",
        emailAddress: "மின்னஞ்சல் முகவரி",
        emailPlaceholder: "you@example.com",
        password: "கடவுச்சொல்",
        role: "பங்கு (Role)",
        institutionName: "நிறுவனத்தின் பெயர்",
        institutionPlaceholder: "எ.கா. மாநில பல்கலைக்கழகம்",
        signInBtn: "உள்நுழைக",
        createAccountBtn: "கணக்கு உருவாக்குக",
        processing: "செயல்பாட்டில் உள்ளது...",
        noAccount: "கணக்கு இல்லையா? பதிவு செய்க",
        haveAccount: "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக",
        citizenRole: "குடிமகன் (சிக்கலை பதிவிடுக)",
        universityRole: "பல்கலைக்கழகம் (சிக்கலை தீர்க்கவும்)",
        industryRole: "தொழில்துறை (ஆதரவு மற்றும் தீர்வு)",
        collaborateTitle: "இணைந்து செயல்படுக",
        collaborateDesc: "குடிமக்கள், பல்கலைக்கழகங்கள் மற்றும் தொழில்துறையுடன் இணையுங்கள்.",
        innovateTitle: "புதுமைப்படுத்துக",
        innovateDesc: "நிஜ உலகிற்கு தேவையான தீர்வுகளை உருவாக்குங்கள்.",
        verifyTitle: "சரிபார்க்கவும்",
        verifyDesc: "சமூகத்தில் தீர்வுகளை நேரடியாக செயல்படுத்தி சரிபார்க்கவும்."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
