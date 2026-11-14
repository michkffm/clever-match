import React, { useState } from 'react';
import {
  Star,
  Heart,
  Zap,
  Users,
  Eye,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import './Premium.css';

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  badge?: string;
  recommended?: boolean;
}

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'basic',
    name: 'Standard',
    price: 9.99,
    period: 'monatlich',
    description: 'Für gelegentliche Nutzer',
    features: [
      '10 Superlikes/Monat',
      'Nachricht-Reaktionen',
      'Profile unsichtbar machen',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: 'monatlich',
    description: 'Beliebteste Option',
    features: [
      'Unbegrenzte Superlikes',
      'Nachricht-Reaktionen',
      'Profile unsichtbar machen',
      'Event-Mitteilungen',
      'Alle Matcher sehen',
      'Chat Favoriten',
    ],
    recommended: true,
    badge: 'Empfohlen',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 39.99,
    period: 'monatlich',
    description: 'Für ernsthafte Tänzer',
    features: [
      'Alles aus Premium',
      'Prioritäts-Support',
      'Events-VIP Zugang',
      '50% Rabatt auf Events',
      'Chat-Boosts (3x Woche)',
      'Profile an Top platzieren',
      'Verified Badge',
    ],
  },
];

const FEATURES = [
  { icon: Zap, name: 'Superlikes', basic: '10/Monat', premium: 'Unbegrenzt', elite: 'Unbegrenzt' },
  { icon: Heart, name: 'Nachricht-Reaktionen', basic: true, premium: true, elite: true },
  { icon: Eye, name: 'Unsichtbares Profil', basic: true, premium: true, elite: true },
  { icon: TrendingUp, name: 'Event-Mitteilungen', basic: false, premium: true, elite: true },
  { icon: Users, name: 'Alle Matcher sehen', basic: false, premium: true, elite: true },
  { icon: Star, name: 'Priority Support', basic: false, premium: false, elite: true },
  { icon: Eye, name: 'Verified Badge', basic: false, premium: false, elite: true },
  { icon: Zap, name: 'Chat-Boosts', basic: false, premium: false, elite: '3x/Woche' },
];

export const Premium: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [showComparison, setShowComparison] = useState(false);

  const handleSubscribe = (planId: string) => {
    console.log('Subscribe to:', planId);
    // Hier später: Stripe Integration
  };

  return (
    <MainLayout>
      <div className="premium-container">
        {/* Header */}
        <div className="premium-header">
          <div className="premium-header-content">
            <Star size={32} className="premium-star" />
            <h1>TanzMatch Premium</h1>
            <p>Finde deinen perfekten Tanzpartner schneller und einfacher</p>
          </div>
        </div>

        {/* Plans */}
        <div className="premium-plans">
          {PREMIUM_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`premium-plan-card ${plan.recommended ? 'recommended' : ''}`}
            >
              {plan.badge && (
                <div className="premium-plan-badge">{plan.badge}</div>
              )}

              <h2>{plan.name}</h2>
              <div className="premium-plan-price">
                <span className="price">{plan.price}€</span>
                <span className="period">/{plan.period}</span>
              </div>
              <p className="premium-plan-description">{plan.description}</p>

              <button
                onClick={() => {
                  setSelectedPlan(plan.id);
                  handleSubscribe(plan.id);
                }}
                className={`premium-plan-btn ${
                  selectedPlan === plan.id ? 'active' : ''
                }`}
              >
                {plan.id === 'basic'
                  ? 'Aktueller Plan'
                  : 'Jetzt upgraden'}
              </button>

              <div className="premium-plan-features">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="premium-feature-item">
                    <Check size={16} />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="premium-section">
          <div className="premium-section-header">
            <h2>Feature Vergleich</h2>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="premium-toggle-btn"
            >
              {showComparison ? 'Ausblenden' : 'Anzeigen'}
            </button>
          </div>

          {showComparison && (
            <div className="premium-comparison-table">
              <div className="comparison-header">
                <div className="comparison-feature">Feature</div>
                <div className="comparison-plan">Standard</div>
                <div className="comparison-plan">Premium</div>
                <div className="comparison-plan">Elite</div>
              </div>

              {FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="comparison-row">
                    <div className="comparison-feature">
                      <Icon size={16} />
                      {feature.name}
                    </div>
                    <div className="comparison-plan">
                      {typeof feature.basic === 'boolean' ? (
                        feature.basic ? (
                          <Check size={18} className="check-icon" />
                        ) : (
                          <X size={18} className="x-icon" />
                        )
                      ) : (
                        feature.basic
                      )}
                    </div>
                    <div className="comparison-plan">
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? (
                          <Check size={18} className="check-icon" />
                        ) : (
                          <X size={18} className="x-icon" />
                        )
                      ) : (
                        feature.premium
                      )}
                    </div>
                    <div className="comparison-plan">
                      {typeof feature.elite === 'boolean' ? (
                        feature.elite ? (
                          <Check size={18} className="check-icon" />
                        ) : (
                          <X size={18} className="x-icon" />
                        )
                      ) : (
                        feature.elite
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="premium-section">
          <h2>Häufig gestellte Fragen</h2>
          <div className="premium-faq">
            <details className="faq-item">
              <summary>Kann ich jederzeit kündigen?</summary>
              <p>
                Ja, du kannst dein Abonnement jederzeit ohne Grund kündigen.
                Keine versteckten Gebühren!
              </p>
            </details>

            <details className="faq-item">
              <summary>Wie funktioniert die Abrechnung?</summary>
              <p>
                Die Abrechnung erfolgt monatlich am Stichtag. Der Zugriff auf
                Premium-Features beginnt sofort nach dem Kauf.
              </p>
            </details>

            <details className="faq-item">
              <summary>Gibt es ein kostenloses Testabo?</summary>
              <p>
                Ja! Du kannst Premium 7 Tage kostenlos testen. Danach wird dein
                gewähltes Abo aktiviert.
              </p>
            </details>

            <details className="faq-item">
              <summary>Kann ich den Plan wechseln?</summary>
              <p>
                Selbstverständlich! Du kannst jederzeit zu einem anderen Plan
                wechseln oder aktualisieren.
              </p>
            </details>
          </div>
        </div>

        {/* CTA */}
        <div className="premium-cta">
          <h2>Bereit zum Upgrade?</h2>
          <p>Starten Sie 7 Tage kostenlos – Keine Kreditkarte erforderlich!</p>
          <button
            onClick={() => handleSubscribe('premium')}
            className="btn-primary premium-cta-btn"
          >
            Kostenlos starten
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Premium;
