# Universal Power Plant Feasibility

A comprehensive, web-based tool for evaluating the financial feasibility of power plant projects. This application supports various technologies (Biomass, Biogas, Solar, etc.) and allows for detailed modeling of technical, financial, and operational parameters.

## Key Features

### 📊 Dynamic Financial Modeling
*   **Core Metrics**: Calculate NPV, IRR (Project & Equity), LCOE, DSCR, and Payback Period.
*   **Cash Flow Analysis**: Detailed annual breakdown of revenue, expenses, and debt service.
*   **Cumulative Cash Flow**: Visualize the break-even point and long-term accumulation.

### ⚙️ Comprehensive Inputs
*   **Detailed OPEX**: Itemize operational expenses with flexible frequency (monthly, yearly, per unit).
*   **Admin Costs**: Manage personnel salaries, welfare, and office expenses separately.
*   **Capital Expenditures**: Break down CAPEX into construction, machinery, land, and others.

### 🧪 Simulation & Sensitivity
*   **Simulation Scenarios**: Create "What-If" scenarios (e.g., "Price drops 10% in Year 5") and compare them side-by-side with the Base Case.
*   **Visual Comparison**: Bar charts for IRR and Line charts for Cash Flow comparisons.
*   **Sensitivity Analysis**: (Beta) Automated sensitivity checks for Price and CAPEX.

### 🛠️ Usability
*   **Interactive Dashboard**: Real-time charts and KPIs.
*   **Auto-Save**: Project data persists in the browser (LocalStorage).
*   **Report Generation**: Print-ready financial reports.

## Getting Started

1.  **Open the Application**: Double-click `index.html` to launch. No server required.
2.  **Parameters Tab**: Configure your project inputs (Capacity, CAPEX, Financing).
3.  **Detailed Inputs**: Use "Detailed OPEX" and "Admin Costs" for granular control.
4.  **Calculate**: Click the "Calculate" button to generate the Base Case.
5.  **Simulation Tab**: Add events to stress-test your model.
6.  **Report Tab**: Generate a summary PDF.

## Project Structure

*   `app.js`: Main application controller and routing.
*   `input_manager.js`: Handles core inputs and calculation logic.
*   `simulation_manager.js`: Manages simulation scenarios and comparison logic.
*   `dashboard.js`: Renders the main dashboard charts.
*   `financial_manager.js` & `report_manager.js`: Handle specific views.
*   `calculator.js`: Pure utility library for financial math (NPV, IRR).
*   `tests/`: Test scripts.

## Technologies

*   **HTML5 & CSS3**: Modern "Glassmorphism" UI.
*   **Vanilla JavaScript**: High performance, zero dependencies.
*   **Chart.js**: Interactive data visualization.
*   **Font Awesome** & **Google Fonts**.

## License

This project is for educational and feasibility analysis purposes.
