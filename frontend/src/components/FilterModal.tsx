import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../utils/i18n';
import './FilterModal.css';
export interface FilterState { ageMin: number; ageMax: number; radiusMax: number; }
interface Props { isOpen: boolean; onClose: () => void; onApplyFilters: (filters: FilterState) => void; }
export default function FilterModal({ isOpen, onClose, onApplyFilters }: Props) {
  const en = useLanguage() === 'en';
  const dialog = useRef<HTMLDialogElement>(null);
  const [filters, setFilters] = useState<FilterState>({ ageMin: 18, ageMax: 99, radiusMax: 500 });
  useEffect(() => {
    const element = dialog.current;
    if (isOpen && !element?.open) element?.showModal();
    if (!isOpen && element?.open) element.close();
  }, [isOpen]);
  return <dialog ref={dialog} className="filter-modal" aria-labelledby="filter-title" onCancel={onClose} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onApplyFilters(filters); onClose(); }}>
      <div className="filter-modal-header"><h2 id="filter-title">{en ? 'Search preferences' : 'Suchkriterien'}</h2><button type="button" onClick={onClose} aria-label={en ? 'Close filters' : 'Filter schließen'}>×</button></div>
      <div className="filter-modal-content">
        <label htmlFor="age-min">{en ? 'Minimum age' : 'Mindestalter'}</label>
        <input id="age-min" type="number" min={18} max={filters.ageMax} value={filters.ageMin} onChange={e => setFilters({ ...filters, ageMin: Number(e.target.value) })} />
        <label htmlFor="age-max">{en ? 'Maximum age' : 'Höchstalter'}</label>
        <input id="age-max" type="number" min={filters.ageMin} max={99} value={filters.ageMax} onChange={e => setFilters({ ...filters, ageMax: Number(e.target.value) })} />
        <div className="filter-distance-label"><label htmlFor="distance">{en ? 'Maximum distance' : 'Maximale Entfernung'}</label><output htmlFor="distance" aria-hidden="true">{filters.radiusMax} km</output></div>
        <input id="distance" type="range" min={1} max={500} step={1} aria-valuetext={`${filters.radiusMax} km`} value={filters.radiusMax} onChange={e => setFilters({ ...filters, radiusMax: Number(e.target.value) })} />
        <p>{en ? 'Profiles without an age or known distance remain visible.' : 'Profile ohne Altersangabe oder bekannte Entfernung bleiben sichtbar.'}</p>
      </div>
      <div className="filter-modal-footer"><button type="button" onClick={() => setFilters({ ageMin: 18, ageMax: 99, radiusMax: 500 })}>{en ? 'Reset' : 'Zurücksetzen'}</button><button type="submit">{en ? 'Apply filters' : 'Filter anwenden'}</button></div>
    </form>
  </dialog>;
}
