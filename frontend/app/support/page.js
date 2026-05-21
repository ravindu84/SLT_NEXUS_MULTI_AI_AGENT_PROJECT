import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../components/LegalPage.module.css";

export const metadata = {
  title: "Help & Support | SLT NEXUS",
};

export default function Support() {
  return (
    <div className={styles.pageContainer}>
      <nav className={styles.nav}>
        <img src="/assets/logo.png" alt="SLT NEXUS" className={styles.navLogo} />
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </nav>

      <div className={styles.contentWrapper}>
        <h1 className={styles.title}>Help & Support</h1>
        <p className={styles.subtitle}>Get Assistance with SLT NEXUS Platform</p>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>EN</span> English
          </h2>
          <div className={styles.textBody}>
            Need assistance with SLT NEXUS or your SLT-MOBITEL connection? We are here to help.<br/><br/>
            <strong>AI Agent Assistance:</strong> Simply ask LIYA, MAYA, or NEO any query directly through the microphone interface.<br/><br/>
            <strong>Network & Fault Support:</strong> For advanced technical difficulties, our Network Operations Center (NOC) and Digital Support Unit (DSU) teams are actively monitoring system integrity.<br/><br/>
            <strong>Contact Us:</strong> If the AI platform is unavailable, please dial 1212 for general SLT-MOBITEL customer care, or visit your nearest regional office.<br/><br/>
            <em>Platform powered and maintained by the NEXGEN Creators Team.</em>
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>SI</span> සිංහල
          </h2>
          <div className={styles.textBody}>
            SLT NEXUS වේදිකාව හෝ ඔබගේ SLT-MOBITEL සබැඳුම පිළිබඳව සහාය අවශ්‍යද? අපි ඔබට උදව් කිරීමට සූදානම්.<br/><br/>
            <strong>AI නියෝජිත සහාය:</strong> මයික්‍රොෆෝනය හරහා සෘජුවම LIYA, MAYA, හෝ NEO ගෙන් ඕනෑම ගැටළුවක් විමසන්න.<br/><br/>
            <strong>ජාල සහ දෝෂ සහාය:</strong> උසස් තාක්ෂණික ගැටළු සඳහා, අපගේ ජාල මෙහෙයුම් මධ්‍යස්ථානය (NOC) සහ ඩිජිටල් සහායක ඒකකය (DSU) නිරන්තරයෙන් පද්ධතිය නිරීක්ෂණය කරමින් සිටී.<br/><br/>
            <strong>අපව අමතන්න:</strong> AI වේදිකාව ක්‍රියාත්මක නොවන අවස්ථාවකදී, සාමාන්‍ය පාරිභෝගික සේවා සඳහා කරුණාකර 1212 අමතන්න, නැතහොත් ඔබගේ ආසන්නතම ප්‍රාදේශීය කාර්යාලය වෙත පැමිණෙන්න.<br/><br/>
            <em>මෙම වේදිකාව NEXGEN Creators කණ්ඩායමේ නිර්මාණයක් සහ නඩත්තුවකි.</em>
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>TA</span> தமிழ்
          </h2>
          <div className={styles.textBody}>
            SLT NEXUS அல்லது உங்கள் SLT-MOBITEL இணைப்பு தொடர்பாக உதவி தேவையா? நாங்கள் உதவ தயாராக உள்ளோம்.<br/><br/>
            <strong>AI பிரதிநிதி ஆதரவு:</strong> மைக்ரோஃபோன் ஊடாக நேரடியாக LIYA, MAYA அல்லது NEO விடம் உங்கள் கேள்விகளைக் கேளுங்கள்.<br/><br/>
            <strong>நெட்வொர்க் மற்றும் தொழில்நுட்ப ஆதரவு:</strong> மேம்பட்ட தொழில்நுட்ப சிக்கல்களுக்கு, எங்கள் நெட்வொர்க் செயல்பாட்டு மையம் (NOC) மற்றும் டிஜிட்டல் ஆதரவு அலகு (DSU) எப்போதும் கண்காணிப்பில் உள்ளன.<br/><br/>
            <strong>தொடர்புகளுக்கு:</strong> AI இயங்குதளம் செயல்படாத நிலையில், பொதுவான வாடிக்கையாளர் சேவைக்கு 1212 ஐ அழைக்கவும் அல்லது உங்கள் அருகிலுள்ள பிராந்திய அலுவலகத்திற்குச் செல்லவும்.<br/><br/>
            <em>இந்த இயங்குதளம் NEXGEN Creators குழுவினால் உருவாக்கப்பட்டு பராமரிக்கப்படுகிறது.</em>
          </div>
        </div>
      </div>
    </div>
  );
}
