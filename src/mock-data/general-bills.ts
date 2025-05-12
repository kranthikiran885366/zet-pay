
import type { Biller } from '@/services/recharge'; // Using Biller type for consistency

export const mockCableProvidersData: Biller[] = [
    { billerId: 'hathway-cable', billerName: 'Hathway Cable TV', billerType: 'Cable TV', logoUrl: '/logos/hathway.png' },
    { billerId: 'den-cable', billerName: 'DEN Networks', billerType: 'Cable TV', logoUrl: '/logos/den.png' },
];

export interface HousingSociety {
    id: string;
    name: string;
    city: string;
}
export const mockSocietiesData: HousingSociety[] = [
    { id: 'soc1', name: 'Prestige Lakeside Habitat', city: 'Bangalore' },
    { id: 'soc2', name: 'DLF Park Place', city: 'Gurgaon' },
];

export interface Club {
    id: string;
    name: string;
}
export const mockClubsData: Club[] = [
    { id: 'club1', name: 'City Sports Club' },
    { id: 'club2', name: 'Downtown Recreational Club' },
];

export interface Municipality {
    id: string;
    name: string;
    state: string;
}
export const mockMunicipalitiesData: Municipality[] = [
    { id: 'bbmp', name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)', state: 'Karnataka' },
    { id: 'mcgm', name: 'Municipal Corporation of Greater Mumbai (MCGM)', state: 'Maharashtra' },
];

export interface Charity {
    id: string;
    name: string;
    description: string;
    logoUrl?: string;
}
export const mockCharitiesData: Charity[] = [
    { id: 'charity1', name: 'Akshaya Patra Foundation', description: 'Providing mid-day meals to children', logoUrl: '/logos/akshayapatra.png' },
    { id: 'charity2', name: 'CRY - Child Rights and You', description: 'Working for child rights', logoUrl: '/logos/cry.png' },
];

export interface LpgProvider {
    id: string;
    name: string;
    logoUrl?: string;
    identifierLabel: string;
    identifierPlaceholder: string;
}
export const mockLpgProvidersData: LpgProvider[] = [
    { id: 'indane', name: 'Indane Gas (IndianOil)', logoUrl: '/logos/indane.png', identifierLabel: 'LPG ID / Registered Mobile', identifierPlaceholder: 'Enter LPG ID or Mobile No.' },
    { id: 'hp-gas', name: 'HP Gas', logoUrl: '/logos/hp_gas.png', identifierLabel: 'Consumer Number / Mobile No.', identifierPlaceholder: 'Enter Consumer No. or Mobile No.' },
];
