import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useLanguage } from '../utils/i18n';

export default function Premium() {
  const en = useLanguage() === 'en';
  return <MainLayout><section className="settings-container">
    <h1>{en ? 'Clever Match is free' : 'Clever Match ist kostenlos'}</h1>
    <p>{en ? 'Discover dance partners, match and chat without a subscription. No payment details are required.' : 'Entdecke Tanzpartner, finde Matches und chatte ohne Abonnement. Du benötigst keine Zahlungsdaten.'}</p>
    <Link to="/">{en ? 'Discover dance partners' : 'Tanzpartner entdecken'}</Link>
  </section></MainLayout>;
}
