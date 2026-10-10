import { useMenu } from '@/context/menu';
import { formatPhoneNumber, whatsappLink } from '@/lib/whatsapp';

// Our WhatsApp number (from the sheet's Settings tab) as a chat link and as text.
export function useWhatsAppContact() {
  const { settings } = useMenu();
  return {
    href: whatsappLink(settings.whatsapp),
    displayNumber: formatPhoneNumber(settings.whatsapp),
  };
}
