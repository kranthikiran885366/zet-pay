
export interface Fund {
    fundId: string;
    name: string;
    category: string;
    risk: string;
    rating: number;
}
export interface FundDetails extends Fund {
    nav: number;
    returns: { '1Y': number; '3Y': number; '5Y': number };
    expenseRatio: number;
    minInvestment: number;
    minSip: number;
}
export interface PortfolioSummary {
    totalInvestment: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
}
export interface Holding {
    fundId: string;
    fundName: string;
    units: number;
    avgBuyPrice: number;
    investedAmount: number;
    currentValue: number;
    profitLoss: number;
}

export const mockFundsData: Fund[] = [
    { fundId: 'INF174K01LS2', name: 'Axis Bluechip Fund Direct Plan-Growth', category: 'Large Cap', risk: 'High', rating: 5 },
    { fundId: 'INF846K01EW2', name: 'Parag Parikh Flexi Cap Fund Direct-Growth', category: 'Flexi Cap', risk: 'Very High', rating: 5 },
];

export const mockFundDetailsData: { [key: string]: Omit<FundDetails, 'fundId' | 'name' | 'category' | 'risk' | 'rating'> } = {
    'INF174K01LS2': { nav: 58.75, returns: { '1Y': 15.5, '3Y': 12.1, '5Y': 14.8 }, expenseRatio: 0.75, minInvestment: 1000, minSip: 500 },
    'INF846K01EW2': { nav: 75.12, returns: { '1Y': 25.2, '3Y': 18.5, '5Y': 20.1 }, expenseRatio: 0.65, minInvestment: 1000, minSip: 1000 },
};

export const mockPortfolioData: Holding[] = [
     { fundId: 'INF174K01LS2', fundName: 'Axis Bluechip Fund Direct Plan-Growth', units: 170.22, avgBuyPrice: 50.00, investedAmount: 8511.00, currentValue: 10000.00, profitLoss: 1489.00 },
];
export const mockPortfolioSummaryData: PortfolioSummary = {
    totalInvestment: 12837.40,
    currentValue: 15000.00,
    profitLoss: 2162.60,
    profitLossPercentage: 16.85,
};
