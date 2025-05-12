
export interface Insurer {
    id: string;
    name: string;
    logoUrl?: string;
}
export const mockInsurersData: { [type: string]: Insurer[] } = {
    'bike': [
        { id: 'acko-bike', name: 'Acko General Insurance', logoUrl: '/logos/acko.png' },
        { id: 'hdfc-ergo-bike', name: 'HDFC ERGO General Insurance', logoUrl: '/logos/hdfc_ergo.png' },
    ],
    'car': [
        { id: 'bajaj-allianz-car', name: 'Bajaj Allianz General Insurance', logoUrl: '/logos/bajaj_allianz.png' },
        { id: 'tata-aig-car', name: 'TATA AIG General Insurance', logoUrl: '/logos/tata_aig.png' },
    ],
    'health': [
        { id: 'star-health', name: 'Star Health Insurance', logoUrl: '/logos/star_health.png' },
        { id: 'care-health', name: 'Care Health Insurance', logoUrl: '/logos/care.png' },
    ],
    'life': [
        { id: 'lic', name: 'Life Insurance Corporation (LIC)', logoUrl: '/logos/lic.png' },
        { id: 'hdfc-life', name: 'HDFC Life Insurance', logoUrl: '/logos/hdfc_life.png' },
    ]
};
