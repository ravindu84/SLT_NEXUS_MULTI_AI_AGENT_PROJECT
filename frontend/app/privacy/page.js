import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../components/LegalPage.module.css";

export const metadata = {
  title: "Privacy Policy | SLT NEXUS",
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.pageContainer}>
      <nav className={styles.nav}>
        <img src="/assets/logo.png" alt="SLT NEXUS" className={styles.navLogo} />
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </nav>

      <div className={styles.contentWrapper}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>SLT NEXUS Platform Privacy Guidelines</p>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>EN</span> English
          </h2>
          <div className={styles.textBody}>
            At SLT-MOBITEL, your privacy is our priority. This Privacy Policy outlines how the SLT NEXUS Visual AI Platform collects, uses, and protects your information. When you interact with our AI agents (LIYA, MAYA, and NEO), we may process real-time voice and text inputs solely to provide accurate customer support, network diagnostics, and enterprise communication services. We do not store personal biometric voice prints without explicit consent. All data processing is heavily secured and monitored by our Digital Support Unit (DSU) to ensure compliance with SLT-MOBITEL data protection standards. We do not share your interaction data with unauthorized third parties.
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>SI</span> සිංහල
          </h2>
          <div className={styles.textBody}>
            SLT-MOBITEL හිදී, ඔබගේ පෞද්ගලිකත්වය අපට ඉතා වැදගත් වේ. SLT NEXUS දෘශ්‍ය AI වේදිකාව මගින් ඔබගේ තොරතුරු ලබාගන්නා, භාවිතා කරන සහ ආරක්ෂා කරන ආකාරය මෙම ප්‍රතිපත්තියෙන් පැහැදිලි කෙරේ. ඔබ අපගේ AI නියෝජිතයන් (LIYA, MAYA සහ NEO) සමග සම්බන්ධ වන විට, නිවැරදි පාරිභෝගික සහාය සහ ජාල (network) සේවා සැපයීම සඳහා පමණක් අපි ඔබගේ හඬ සහ පෙළ (text) තත්‍යසමනුව (real-time) සැකසුම් කරමු. ඔබගේ පැහැදිලි අවසරයකින් තොරව අපි පුද්ගලික හඬ දත්ත ගබඩා නොකරමු. සියලුම දත්ත සැකසුම් අපගේ ඩිජිටල් සහායක ඒකකය (DSU) මගින් දැඩි ලෙස ආරක්ෂා කර අධීක්ෂණය කරනු ලබයි. ඔබගේ දත්ත බාහිර පාර්ශවයන් සමග බෙදා නොගනී.
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>TA</span> தமிழ்
          </h2>
          <div className={styles.textBody}>
            SLT-MOBITEL இல், உங்கள் தனியுரிமைக்கு நாங்கள் முன்னுரிமை அளிக்கிறோம். SLT NEXUS Visual AI இயங்குதளம் உங்கள் தகவல்களை எவ்வாறு சேகரிக்கிறது, பயன்படுத்துகிறது மற்றும் பாதுகாக்கிறது என்பதை இந்தக் கொள்கை விளக்குகிறது. எங்கள் AI பிரதிநிதிகளுடன் (LIYA, MAYA, NEO) நீங்கள் தொடர்பு கொள்ளும்போது, துல்லியமான வாடிக்கையாளர் ஆதரவு மற்றும் நெட்வொர்க் சேவைகளை வழங்க மட்டுமே உங்கள் குரல் மற்றும் உரை உள்ளீடுகளை நிகழ்நேரத்தில் செயலாக்குகிறோம். உங்கள் அனுமதியின்றி தனிப்பட்ட குரல் தரவுகளை நாங்கள் சேமிப்பதில்லை. அனைத்து தரவு செயலாக்கங்களும் எங்கள் டிஜிட்டல் ஆதரவு அலகு (DSU) மூலம் பாதுகாப்பாக கண்காணிக்கப்படுகின்றன. உங்கள் தகவல்களை மூன்றாம் தரப்பினருடன் நாங்கள் பகிரமாட்டோம்.
          </div>
        </div>
      </div>
    </div>
  );
}
