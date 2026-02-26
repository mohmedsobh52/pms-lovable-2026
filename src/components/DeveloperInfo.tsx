import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Phone, Mail, MapPin, Building2, Linkedin } from "lucide-react";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";

const developer = {
  name: "Dr.Eng. Mohamed Sobh",
  titleAr: "مدير المشاريع",
  titleEn: "Projects Director",
  company: "AL IMTYAZ ALWATANIYA CONT.",
  phone: "+966 54 800 0243",
  email: "moh.sobh@imtyaz.sa",
  email2: "mohammed_sobh2020@yahoo.om",
  linkedin: "https://www.linkedin.com/in/mohamed-sobh-ab2083ba/",
  photo: developerPhoto,
  address: {
    ar: "شارع الأمير محمد بن عبدالعزيز، فندق WA، الدور 13، جدة 23453",
    en: "Prince Mohammed Bin Abdulaziz St., WA Hotel, 13th Floor, Jeddah 23453"
  }
};

interface ContactItemProps {
  icon: React.ElementType;
  value: string;
  href?: string;
}

function ContactItem({ icon: Icon, value, href }: ContactItemProps) {
  const content = (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
      <span className="text-muted-foreground hover:text-foreground transition-colors">
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}

export function DeveloperInfo() {
  const { isArabic } = useLanguage();

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-shadow duration-300">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/30 flex-shrink-0 shadow-lg ring-2 ring-white/20 ring-offset-2 ring-offset-orange-500">
            <img 
              src={developer.photo} 
              alt={developer.name}
              className="w-full h-full object-cover"
              style={{ imageRendering: 'auto' }}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">{developer.name}</h3>
            <p className="opacity-90">{isArabic ? developer.titleAr : developer.titleEn}</p>
            <p className="opacity-75 text-sm">{developer.company}</p>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h4 className="font-semibold">
            {isArabic ? "معلومات الاتصال" : "Contact Information"}
          </h4>
        </div>

        <div className="space-y-3">
          <ContactItem 
            icon={Phone} 
            value={developer.phone} 
            href={`tel:${developer.phone.replace(/\s/g, '')}`} 
          />
          <ContactItem 
            icon={Mail} 
            value={developer.email} 
            href={`mailto:${developer.email}`} 
          />
          <ContactItem 
            icon={Mail} 
            value={developer.email2} 
            href={`mailto:${developer.email2}`} 
          />
          <ContactItem 
            icon={Linkedin} 
            value={isArabic ? "الملف الشخصي على LinkedIn" : "LinkedIn Profile"} 
            href={developer.linkedin} 
          />
          <ContactItem 
            icon={MapPin} 
            value={isArabic ? developer.address.ar : developer.address.en} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DeveloperInfoCompact() {
  const { isArabic } = useLanguage();

  return (
    <footer className="bg-gradient-to-r from-[hsl(218,50%,12%)] to-[hsl(218,45%,18%)] border-t border-white/10 py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Developer Info */}
          <div className="flex items-center gap-3">
            <img
              src={developer.photo}
              alt={developer.name}
              className="w-10 h-10 rounded-full ring-2 ring-orange-500/40 object-cover shadow-md"
              loading="lazy"
            />
            <div className="leading-tight">
              <p className="text-white font-semibold text-sm">{developer.name}</p>
              <p className="text-white/50 text-[11px]">
                {isArabic ? developer.titleAr : developer.titleEn}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-4 text-white/60 text-xs">
            <a href={`tel:${developer.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 text-orange-400/70" />
              <span>{developer.phone}</span>
            </a>
            <a href={`mailto:${developer.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5 text-orange-400/70" />
              <span>{developer.email}</span>
            </a>
          </div>

          {/* Company Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white border-2 border-orange-500/40 p-0.5 flex items-center justify-center shadow-sm">
              <img src={alimtyazLogo} alt="AL IMTYAZ" className="w-full h-full rounded object-contain" loading="lazy" />
            </div>
            <span className="text-white/50 text-[11px] leading-tight max-w-[120px]">
              AL IMTYAZ ALWATANIYA CONT.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
