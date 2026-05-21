import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../components/LegalPage.module.css";

export const metadata = {
  title: "Terms of Service | SLT NEXUS",
};

export default function TermsOfService() {
  return (
    <div className={styles.pageContainer}>
      <nav className={styles.nav}>
        <img src="/assets/logo.png" alt="SLT NEXUS" className={styles.navLogo} />
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </nav>

      <div className={styles.contentWrapper}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>SLT NEXUS Platform Rules & Guidelines</p>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>EN</span> English
          </h2>
          <div className={styles.textBody}>
            Welcome to SLT NEXUS, a next-generation AI platform powered by NEXGEN Creators. By using this service, you agree to these Terms of Service. SLT NEXUS is designed to assist with SLT-MOBITEL telecom inquiries, network fault handling, and general guidance. Users are expected to interact with the visual AI agents respectfully and must not use the platform to transmit malicious code, abusive language, or unauthorized data. While our AI agents strive for complete accuracy, responses are generated automatically; critical network or billing decisions should be verified with official SLT-MOBITEL representatives. We reserve the right to suspend access to the platform for any misuse.
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>SI</span> සිංහල
          </h2>
          <div className={styles.textBody}>
            NEXGEN Creators විසින් බලගන්වන ලද, මීළඟ පරම්පරාවේ AI වේදිකාව වන SLT NEXUS වෙත ඔබව සාදරයෙන් පිළිගනිමු. මෙම සේවාව භාවිතා කිරීමෙන්, ඔබ මෙම සේවා කොන්දේසි වලට එකඟ වේ. SLT NEXUS නිර්මාණය කර ඇත්තේ SLT-MOBITEL විමසීම්, ජාල දෝෂ (fault handling) සහ සාමාන්‍ය මාර්ගෝපදේශ සඳහා සහාය වීමටයි. පරිශීලකයින් AI නියෝජිතයින් සමග ගෞරවනීය ලෙස අදහස් හුවමාරු කරගත යුතු අතර, අනිසි භාෂාව හෝ අනවසර දත්ත සම්ප්‍රේෂණය කිරීම සඳහා වේදිකාව භාවිතා නොකළ යුතුය. අපගේ AI නියෝජිතයින් උපරිම නිවැරදිභාවයක් ලබා දීමට උත්සාහ කළද, ඉතා වැදගත් ජාල හෝ බිල්පත් තීරණ නිල SLT-MOBITEL නියෝජිතයෙකු සමග තහවුරු කරගත යුතුය. සේවාව අවභාවිතා කරන ඕනෑම අවස්ථාවක ප්‍රවේශය අත්හිටුවීමේ අයිතිය අප සතුය.
          </div>
        </div>

        <div className={styles.langSection}>
          <h2 className={styles.langTitle}>
            <span className={styles.langBadge}>TA</span> தமிழ்
          </h2>
          <div className={styles.textBody}>
            NEXGEN Creators இனால் உருவாக்கப்பட்ட அதிநவீன AI இயங்குளமான SLT NEXUS இற்கு உங்களை வரவேற்கிறோம். இந்த சேவையைப் பயன்படுத்துவதன் மூலம், இந்த சேவை விதிமுறைகளை நீங்கள் ஏற்கிறீர்கள். SLT-MOBITEL தொடர்பான விசாரணைகள் மற்றும் நெட்வொர்க் குறைபாடுகளைக் கையாள SLT NEXUS வடிவமைக்கப்பட்டுள்ளது. பயனர்கள் AI பிரதிநிதிகளுடன் மரியாதையுடன் தொடர்பு கொள்ள வேண்டும், மேலும் தவறான வார்த்தைகள் அல்லது அங்கீகரிக்கப்படாத தரவுகளை அனுப்ப இந்த தளத்தைப் பயன்படுத்தக் கூடாது. AI பதில்கள் தானாகவே உருவாக்கப்படுவதால், முக்கியமான நெட்வொர்க் அல்லது கட்டண முடிவுகளை உத்தியோகபூர்வ SLT-MOBITEL பிரதிநிதியுடன் சரிபார்க்க வேண்டும். தவறாகப் பயன்படுத்தினால் சேவையை நிறுத்துவதற்கான உரிமை எங்களுக்கு உள்ளது.
          </div>
        </div>
      </div>
    </div>
  );
}
