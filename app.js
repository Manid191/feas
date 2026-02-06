document.addEventListener('DOMContentLoaded', () => {

    // --- Check Version and Hard Reset if needed ---
    const currentVersion = window.AppConfig?.appVersion || '1.0';
    const storedVersion = localStorage.getItem('appVersion');

    if (storedVersion !== currentVersion) {
        console.warn(`Version Mismatch: Stored ${storedVersion} vs Current ${currentVersion}. Performing Hard Reset.`);
        StorageManager.deleteAllSaves(); // Clear saved projects
        localStorage.clear(); // Clear everything else
        localStorage.setItem('appVersion', currentVersion);
        window.location.reload(); // Force reload to apply clean state
        return; // Stop execution
    }

    // Flag to track if user has calculated
    window.hasCalculated = false;

    // --- Clear any saved data to start fresh (User Preference) ---
    // Double ensure nothing lingers if version match but user wants fresh start
    // StorageManager.deleteAllSaves(); // Redundant if we rely on versioning, but safe.

    // Initial View with default values from config
    // Initial View with default values from config
    window.inputApps.renderInputs();

    // Initialize Simulation Manager
    if (typeof SimulationManager !== 'undefined') {
        window.simulationApp = new SimulationManager();
    }

    // Debounce Utility
    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    // Auto-Save DISABLED per user request
    // User does not want inputs saved between sessions
    // window.autoSaveTrigger = () => {...};
    // document.addEventListener('input', debounce(window.autoSaveTrigger, 1000));
    // document.addEventListener('change', debounce(window.autoSaveTrigger, 1000));

    // Simple Navigation Handling
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Fix: Force save if leaving "inputs" view to prevent data loss
            const currentActive = document.querySelector('.nav-item.active');
            if (currentActive && currentActive.getAttribute('data-view') === 'inputs') {
                try {
                    const inputs = window.inputApps.getInputs();
                    const state = {
                        view: 'inputs',
                        lastModified: new Date().toISOString(),
                        inputs: inputs
                    };
                    StorageManager.saveProject(state);
                } catch (err) {
                    console.warn('Could not save state on navigation:', err);
                }
            }

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add to clicked
            item.classList.add('active');

            // Update Header (Simulation)
            const viewName = item.getAttribute('data-view');
            updateHeader(viewName);

            // View Routing
            if (viewName === 'inputs') {
                // Capture current state before DOM is wiped by renderInputs
                // We try to get inputs from the active view if possible, or fallback to storage
                let currentInputs = null;

                // If we are coming entirely from another view (e.g. Dashboard), getInputs might fail if DOM elements aren't there?
                // Actually `getInputs` relies on `document.getElementById`.
                // If we are in Dashboard, those IDs don't exist! `input_manager.js` checks DOM.
                // So if we are in Dashboard, `getInputs` returns garbage or errors.

                // Fortunatelly, StorageManager has the latest auto-saved state.
                // And since we autosave on input change, and navigating doesn't change input...
                // But wait, what if I type and click "Dashboard" immediately? Auto-save debounce (1000ms) might not have fired.
                // We should trigger a save before switching views?
                // `updateHeader` is called.

                // Let's force a save or capture when *leaving* a view? 
                // Too complex for this cleanup.

                // Best bet: Load from Storage. 
                // If the user is quick, they might lose 1 second of work. 
                // Let's rely on StorageManager.loadLatestProject() as the primary restoration source when returning to Inputs.
                // But to be safer, we can try to force-save-if-dirty logic?
                // Let's just trust the AutoSave trigger on 'input' event.

                window.inputApps.renderInputs();

                const latest = StorageManager.loadLatestProject();
                if (latest) {
                    window.inputApps.setState(latest);
                }

            } else if (viewName === 'personnel') {
                if (window.personnelApp) {
                    window.personnelApp.render();
                }
            } else if (viewName === 'detailed-opex') {
                if (window.detailedOpexApp) {
                    window.detailedOpexApp.render();
                }
            } else if (viewName === 'admin-cost') {
                if (window.adminApp) {
                    window.adminApp.render();
                }
            } else if (viewName === 'dashboard') {
                if (!window.hasCalculated) {
                    document.getElementById('content-area').innerHTML = `<div class="placeholder-state">
                        <i class="fa-solid fa-calculator"></i>
                        <h2>No Calculation Yet</h2>
                        <p>Please go to <strong>Parameters</strong> and click the <strong>Calculate</strong> button first.</p>
                    </div>`;
                } else {
                    window.inputApps.calculate();
                }
            } else if (viewName === 'financials') {
                if (!window.hasCalculated) {
                    document.getElementById('content-area').innerHTML = `<div class="placeholder-state">
                        <i class="fa-solid fa-chart-line"></i>
                        <h2>No Calculation Yet</h2>
                        <p>Please calculate your parameters first.</p>
                    </div>`;
                } else {
                    // Calculate silently (isSimulation=true) to get results without auto-rendering dashboard
                    const results = window.inputApps.calculate(null, true);
                    if (window.financialApp) {
                        window.financialApp.render(results);
                    }
                }
            } else if (viewName === 'report') {
                if (!window.hasCalculated) {
                    document.getElementById('content-area').innerHTML = `<div class="placeholder-state">
                        <i class="fa-solid fa-file-contract"></i>
                        <h2>No Report Data</h2>
                        <p>Please calculate your parameters first to generate a report.</p>
                    </div>`;
                } else {
                    const inputs = window.inputApps.getInputs();
                    const results = window.inputApps.calculate();
                    const sensitivity = window.inputApps.runSensitivityAnalysis();

                    // Render Report using the results from calculate()
                    if (window.reportApp) {
                        window.reportApp.render(inputs, results, sensitivity);
                    }
                }
            } else if (viewName === 'simulation') {
                if (!window.hasCalculated) {
                    document.getElementById('content-area').innerHTML = `<div class="placeholder-state">
                        <i class="fa-solid fa-flask"></i>
                        <h2>No Base Case Calculated</h2>
                        <p>Please go to <strong>Parameters</strong> and click the <strong>Calculate</strong> button first to establish a Base Case.</p>
                    </div>`;
                } else if (window.simulationApp) {
                    window.simulationApp.init();
                }
            }
        });
    });

    // Export Button Logic
    const exportBtn = document.querySelector('.btn-secondary');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {
                inputs: window.inputApps.getInputs(),
                metadata: {
                    version: '1.0',
                    exportedAt: new Date().toISOString()
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "feasibility_project.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }
});

function updateHeader(viewName) {
    const titleMap = {
        'dashboard': { title: 'Dashboard', sub: 'Overview of your power plant feasibility study' },
        'inputs': { title: 'Parameters', sub: 'Configure technical and financial assumptions' },
        'inputs': { title: 'Parameters', sub: 'Configure technical and financial assumptions' },
        'personnel': { title: 'Personnel Plan', sub: 'Manage headcount and salary costs' },
        'detailed-opex': { title: 'Variable Costs', sub: 'Manage Detailed OPEX (Chemicals, Maintenance, etc.)' },
        'admin-cost': { title: 'Admin Costs', sub: 'Manage Fixed Administrative Expenses (CSR, Insurance, Rent, etc.)' },
        'financials': { title: 'Financial Models', sub: 'Detailed cash flow and ratios' },
        'simulation': { title: 'Simulation Scenarios', sub: 'Model impacts of future changes (Price, Capacity, Costs)' },
        'report': { title: 'Report', sub: 'Generate and export PDF reports' }
    };

    const header = document.getElementById('page-header');
    const subtitle = document.querySelector('.subtitle');

    if (titleMap[viewName]) {
        header.textContent = titleMap[viewName].title;
        subtitle.textContent = titleMap[viewName].sub;
    }
}
