# Changelog

## [4.4] - 2026-02-06
### Fixed
- Added prerequisite check to Simulation tab: Users must now calculate the Base Case before accessing simulations.
- Prevents potential errors where simulation charts would try to render without base data.

## [4.3] - 2026-02-06
### Added
- **Cumulative Cash Flow Chart**: Added a new line chart to the Simulation Results to compare cumulative cash flows over time.
- **Improved Tooltips**: Charts now show data points from all datasets when hovering anywhere on the X-axis (`mode: 'index'`).

## [4.2] - 2026-02-06
### Fixed
- **Cash Flow Calculation Mismatch**: Fixed an issue where the Base Case cash flow in the Simulation tab differed slightly from the Dashboard.
- **Solution**: The Simulation manager now uses the cached result from the main `calculate()` function instead of re-calculating with potentially different states.

## [4.1] - 2026-02-06
### Fixed
- **Simulation Calculation Bug**: Fixed a reference mutation issue where running a simulation modified the original Base Case inputs.
- Implemented Deep Copy (`JSON.parse(JSON.stringify)`) for simulation inputs.

## [4.0] - 2026-02-06
### Changed
- **Decimal Formatting**: Standardized all numeric outputs across the application to display a maximum of 2 decimal places (e.g., Payback Period, IRR).

## [3.9] - 2026-02-06
### Added
- **Simulation Charts**: Added Chart.js visualizations to the Simulation tab.
    - Bar Chart: IRR Comparison (Project & Equity).
    - Line Chart: Annual Cash Flow Comparison.

## [3.8] - 2026-02-06
### Added
- **Simulation Scenarios Feature**:
    - Dedicated "Simulation" tab.
    - Ability to add events (Capacity, Price, OPEX changes).
    - Side-by-side comparison table (IRR, NPV, Payback).
