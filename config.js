/**
 * Power Plant Feasibility - Configuration
 * Centralized Source of Truth for Defaults and Constants
 */
window.AppConfig = {
    // Increment this to force a hard reset on client browsers
    appVersion: '4.4',

    // UI Strings & Labels
    ui: {
        adminNewItemName: 'New Admin Cost',
        adminSummaryTitle: 'Annual Admin Cost Summary',
        adminSummarySub: 'รวมค่าใช้จ่ายบริหารต่อปี (ค่าเฉลี่ย)',
        currency: 'THB',
        currencyUnit: 'Million THB / Year'
    },

    // Calculation Constants
    constants: {
        discountRate: 0.07,     // Used in NPV
        daysInYear: 365,
        defaultProjectYears: 20
    },

    // Default User Inputs
    defaults: {
        productionCapacity: 9.9,
        capacity: 8.0, // Sales Capacity
        projectYears: 20,
        powerFactor: 0.90,
        hoursPerDay: 24,
        daysPerYear: 334,
        revenue: {
            peakRate: 4.5,
            peakHours: 13,
            offPeakRate: 2.6,
            escalation: 0.5,
            adderPrice: 0,
            adderYears: 7
        },
        degradation: 0.5,
        capex: {
            construction: 200,      // 200 M
            machinery: 1000,        // 1000 M
            land: 0,
            others: 0
        },
        finance: {
            debtRatio: 70,
            interestRate: 5.5,
            loanTerm: 10,
            taxRate: 20,
            opexInflation: 1.5,
            taxHoliday: 0
        },
        personnel: [
            // Management
            { category: 'Management', position: 'Managing Director', count: 1, salary: 100000, bonus: 0, increase: 5 },
            { category: 'Management', position: 'Administration Manager', count: 1, salary: 50000, bonus: 0, increase: 5 },
            { category: 'Management', position: 'Engineering & Env Manager', count: 1, salary: 80000, bonus: 0, increase: 5 },
            { category: 'Management', position: 'Operations Manager', count: 1, salary: 80000, bonus: 0, increase: 5 },
            { category: 'Management', position: 'Accounting & Finance Manager', count: 1, salary: 50000, bonus: 0, increase: 5 },

            // Technical
            { category: 'Technical', position: 'Engineer', count: 2, salary: 20000, bonus: 0, increase: 5 },
            { category: 'Technical', position: 'Safety Officer', count: 1, salary: 20000, bonus: 0, increase: 5 },
            { category: 'Technical', position: 'Environmental Officer', count: 1, salary: 15000, bonus: 0, increase: 5 },

            // Finance & Admin Support
            { category: 'HR', position: 'HR Officer', count: 1, salary: 15000, bonus: 0, increase: 5 },
            { category: 'Finance', position: 'Purchasing Officer', count: 1, salary: 15000, bonus: 0, increase: 5 },
            { category: 'Finance', position: 'Accountant', count: 1, salary: 20000, bonus: 0, increase: 5 },
            { category: 'Finance', position: 'Finance Officer', count: 1, salary: 15000, bonus: 0, increase: 5 },

            // Others
            { category: 'Others', position: 'IT Officer', count: 1, salary: 25000, bonus: 0, increase: 5 },
            { category: 'Others', position: 'Store Officer', count: 1, salary: 15000, bonus: 0, increase: 5 },
            { category: 'Others', position: 'Community Relations', count: 1, salary: 15000, bonus: 0, increase: 5 },
            { category: 'Others', position: 'Security Guard', count: 5, salary: 15000, bonus: 0, increase: 5 },
            { category: 'Others', position: 'Cleaner', count: 2, salary: 10000, bonus: 0, increase: 5 },
            { category: 'Others', position: 'Gardener', count: 1, salary: 10000, bonus: 0, increase: 5 }
        ],
        detailedOpexPresets: [
            // --- Fuel ---
            { id: 'srf_{ts}', category: 'Fuel & Energy', name: 'SRF Fuel', mode: 'manual', quantity: 230, unit: 'Ton/Day', freqType: 'daily', price: 1235 },
            { id: 'wood_{ts}', category: 'Fuel & Energy', name: 'Wood Chip (Start-up)', mode: 'manual', quantity: 150, unit: 'Ton/Year', freqType: 'yearly', price: 1500 },
            { id: 'diesel_{ts}', category: 'Fuel & Energy', name: 'Diesel Oil', mode: 'manual', quantity: 80, unit: 'Lit/Day', freqType: 'daily', price: 35 },

            // --- Utilities ---
            { id: 'water_{ts}', category: 'Utilities', name: 'Water Supply (Raw)', mode: 'manual', quantity: 1000, unit: 'm3/Day', freqType: 'daily', price: 12 },
            { id: 'waste_water_{ts}', category: 'Utilities', name: 'Waste Water Treatment', mode: 'linked', linkedSourceId: 'water_{ts}', multiplier: 80, price: 8 },

            // --- Water Treatment Plant (Chemicals) ---
            { id: 'wtp_1', category: 'Water Treatment', name: 'Filter Aid', mode: 'manual', quantity: 25, unit: 'kg/mo', freqType: 'monthly', price: 225 },
            { id: 'wtp_2', category: 'Water Treatment', name: 'Biocide', mode: 'manual', quantity: 25, unit: 'kg/mo', freqType: 'monthly', price: 300 },
            { id: 'wtp_3', category: 'Water Treatment', name: 'Anti-Scale', mode: 'manual', quantity: 20, unit: 'kg/mo', freqType: 'monthly', price: 350 },
            { id: 'wtp_4', category: 'Water Treatment', name: 'Caustic (NaOH 50%)', mode: 'manual', quantity: 25, unit: 'kg/mo', freqType: 'monthly', price: 45 },
            { id: 'wtp_5', category: 'Water Treatment', name: 'EDTA', mode: 'manual', quantity: 25, unit: 'kg/mo', freqType: 'monthly', price: 120 },
            { id: 'wtp_6', category: 'Water Treatment', name: 'Citric Acid', mode: 'manual', quantity: 25, unit: 'kg/mo', freqType: 'monthly', price: 50 },

            // --- Water Treatment (Consumables) ---
            { id: 'wtp_7', category: 'Water Treatment', name: 'Bag Filter 5 micron', mode: 'manual', quantity: 6, unit: 'pc/mo', freqType: 'monthly', price: 500 },
            { id: 'wtp_8', category: 'Water Treatment', name: 'Cartridge Filter 1 micron', mode: 'manual', quantity: 20, unit: 'pc/mo', freqType: 'monthly', price: 180 },

            // --- Cooling Tower ---
            { id: 'ct_1', category: 'Cooling Tower', name: 'Scale Inhibitor', mode: 'manual', quantity: 200, unit: 'kg/mo', freqType: 'monthly', price: 120 },
            { id: 'ct_2', category: 'Cooling Tower', name: 'Sodium Hypochlorite 10%', mode: 'manual', quantity: 1000, unit: 'kg/mo', freqType: 'monthly', price: 9 },
            { id: 'ct_3', category: 'Cooling Tower', name: 'Non-oxidizing Biocide', mode: 'manual', quantity: 119, unit: 'kg/mo', freqType: 'monthly', price: 125 },
            { id: 'ct_4', category: 'Cooling Tower', name: 'Sulfuric Acid 50%', mode: 'manual', quantity: 2500, unit: 'kg/mo', freqType: 'monthly', price: 10 },

            // --- Flue Gas Treatment ---
            { id: 'fg_1', category: 'Flue Gas System', name: 'Lime (ปูนขาว)', mode: 'manual', quantity: 80000, unit: 'kg/mo', freqType: 'monthly', price: 2.5 },
            { id: 'fg_2', category: 'Flue Gas System', name: 'Activated Carbon', mode: 'manual', quantity: 1800, unit: 'kg/mo', freqType: 'monthly', price: 44 },
            { id: 'fg_3', category: 'Flue Gas System', name: 'Bag Filter (ถุงกรอง)', mode: 'manual', quantity: 1, unit: 'set/yr', freqType: 'yearly', price: 60000 },

            // --- Boiler ---
            { id: 'bl_1', category: 'Boiler System', name: 'Trisodium Phosphate', mode: 'manual', quantity: 50, unit: 'kg/mo', freqType: 'monthly', price: 70 },
            { id: 'bl_2', category: 'Boiler System', name: 'Deha Base', mode: 'manual', quantity: 50, unit: 'kg/mo', freqType: 'monthly', price: 125 },
            { id: 'bl_3', category: 'Boiler System', name: 'Amine', mode: 'manual', quantity: 50, unit: 'kg/mo', freqType: 'monthly', price: 125 },

            // --- SNCR System ---
            { id: 'sncr_1', category: 'Flue Gas System', name: 'UREA Solution (10%)', mode: 'manual', quantity: 12960, unit: 'kg/mo', freqType: 'monthly', price: 37 },

            // --- Lab ---
            { id: 'lab_1', category: 'Lab & Safety', name: 'Lab Test Fees', mode: 'manual', quantity: 165, unit: 'sample/mo', freqType: 'monthly', price: 100 },

            // --- Ash Disposal (Updated from Image) ---
            { id: 'ash_bottom_{ts}', category: 'Ash Disposal', name: 'Bottom Ash (70% of 12%)', mode: 'linked', linkedSourceId: 'srf_{ts}', multiplier: 8.4, price: 400 },
            { id: 'ash_fly_{ts}', category: 'Ash Disposal', name: 'Fly Ash (30% of 12%)', mode: 'linked', linkedSourceId: 'srf_{ts}', multiplier: 3.6, price: 1200 },
            { id: 'ash_transport_{ts}', category: 'Ash Disposal', name: 'Ash Transport', mode: 'linked', linkedSourceId: 'srf_{ts}', multiplier: 12, price: 352 }
        ],
        initialOpex: [ // Fixed Costs (General)
            { id: 101, name: 'O&M Contract', type: 'fixed', value: 24000000, quantity: 1, freqType: 'yearly' }, // 2M/Month * 12
            { id: 102, name: 'Maintenance (Routine)', type: 'fixed', value: 12000000, quantity: 1, freqType: 'yearly' }, // 12M/Year
            { id: 103, name: 'Major Maintenance', type: 'fixed', value: 10000000, quantity: 1, freqType: 'every_n', customN: 5 } // 10M / 5 Years
        ],
        adminExpensePresets: [
            { name: 'CSR', type: 'fixed', values: Array(20).fill(0.50) },
            { name: 'Insurance Premium', type: 'fixed', values: Array(20).fill(3.20) },
            { name: 'Electricity', type: 'fixed', values: Array(20).fill(1.80) },
            { name: 'Office Equipment', type: 'growth', start: 0.60, growthRate: 1.5, values: [0.60, 0.61, 0.61, 0.62, 0.62, 0.63, 0.64, 0.64, 0.65, 0.66, 0.66, 0.67, 0.68, 0.68, 0.69, 0.70, 0.70, 0.71, 0.72, 0.72] },
            { name: 'Land Rent', type: 'custom', values: [4.24, 2.12, 2.12, 2.33, 2.33, 2.33, 2.56, 2.56, 2.56, 2.82, 2.82, 2.82, 3.10, 3.10, 3.10, 3.41, 3.41, 3.41, 3.75, 3.75] },
            { name: 'Land Rent (Emission)', type: 'fixed', values: Array(20).fill(0) },
            { name: 'Land Lease Guarantee Fee', type: 'fixed', values: Array(20).fill(0) },
            { name: 'Building Demolition', type: 'custom', values: [...Array(19).fill(0), 0.02] }, // Year 20 only
            { name: 'IEAT Maintenance Fee', type: 'fixed', values: Array(20).fill(0.22) },
            { name: 'Phone/Internet', type: 'custom', values: [0.11, 0.11, 0.11, 0.11, 0.11, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13] },
            { name: 'Fuel/Travel', type: 'fixed', values: Array(20).fill(0.05) },
            { name: 'Power Development Fund', type: 'fixed', values: Array(20).fill(0.80) },
            { name: 'Env Monitoring', type: 'fixed', values: Array(20).fill(1.30) },
            { name: 'Property Tax', type: 'fixed', values: Array(20).fill(0.50) },
            { name: 'Bank Advisor', type: 'custom', values: [...Array(10).fill(0.65), ...Array(10).fill(0)] },
            { name: 'Other Expenses', type: 'custom', values: [1.20, 1.21, 1.22, 1.24, 1.25, 1.26, 1.27, 1.29, 1.30, 1.31, 1.33, 1.34, 1.35, 1.37, 1.38, 1.39, 1.41, 1.42, 1.44, 1.45] }
        ]
    }
};
