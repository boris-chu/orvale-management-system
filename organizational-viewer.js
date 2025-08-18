// Organizational Path Viewer Module - Office → Bureau → Division → Section path selection
// Similar to Category Viewer but for organizational hierarchy

class OrganizationalViewer {
    constructor() {
        this.organizationalData = null;
        this.allPaths = [];
        this.filteredPaths = [];
        this.currentSort = 'office';
        this.searchTerm = '';
        this.isVisible = false;
        
        this.init();
    }

    async init() {
        try {
            // Load organizational data
            await this.loadOrganizationalData();
            
            // Generate organizational paths
            this.generateOrganizationalPaths();
            
            // Attach event listeners
            this.attachEventListeners();
            
            // Ensure modal is hidden on initialization
            this.ensureModalHidden();
            
            console.log('🏢 Organizational Viewer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Organizational Viewer:', error);
        }
    }

    ensureModalHidden() {
        const modal = document.getElementById('organizationalViewerModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            this.isVisible = false;
        }
    }

    async loadOrganizationalData() {
        // Import organizational data
        const module = await import('../settings/categories/organizational-data.js');
        this.organizationalData = module.organizationalData;
        
        console.log('🏢 Organizational data loaded:', {
            offices: this.organizationalData.offices.length,
            bureaus: this.organizationalData.bureaus.length,
            divisions: this.organizationalData.divisions.length,
            sections: this.organizationalData.sections.length
        });
    }

    generateOrganizationalPaths() {
        this.allPaths = [];
        
        // Generate all possible combinations from the actual organizational data
        if (!this.organizationalData) {
            console.warn('🏢 No organizational data available for path generation');
            return;
        }
        
        // Create meaningful organizational path combinations based on actual data
        const realPaths = this.createRealOrganizationalPaths();
        
        realPaths.forEach((pathConfig, index) => {
            this.allPaths.push({
                id: `org_path_${index}`,
                office: pathConfig.office || '[missing]',
                bureau: pathConfig.bureau || '[missing]',
                division: pathConfig.division || '[missing]',
                section: pathConfig.section || '[no section]',
                complete: !!(pathConfig.office && pathConfig.bureau && pathConfig.division),
                confidence: 'high', // All paths from CSV data have high confidence
                officeValue: pathConfig.office,
                bureauValue: pathConfig.bureau,
                divisionValue: pathConfig.division,
                sectionValue: pathConfig.section
            });
        });
        
        console.log('🏢 Generated', this.allPaths.length, 'organizational paths from real data');
    }

    createRealOrganizationalPaths() {
        // Create comprehensive organizational paths using actual data from organizational-data.js
        // Generate all valid Bureau → Division → Section combinations from CSV analysis
        // Office assignments based on known organizational structures
        
        const realPaths = [];
        
        // Define known organizational relationships based on CSV analysis
        const bureauToDivisions = {
            'Bureau of Administrative Services': [
                'Financial Management Division',
                'General Services Division', 
                'Contract Administration and Monitoring Division',
                'Fiscal Operations Division'
            ],
            'Bureau of Technology Services': [
                'Information Technology Services Division',
                'Bureau of Technology Services Administration'
            ],
            'Bureau of Human Resources': [
                'Human Capital Management Branch',
                'Workforce Safety Leave & Disability Comp Branch'
            ],
            'Bureau of Program & Policy': [
                'CalWORKs & GAIN Program Division',
                'General Relief & CalFresh Program Division',
                'Medi-Cal / IHSS Program Division',
                'Program Compliance Division'
            ],
            'Bureau of Customer Service Centers': [
                'Customer Service Center Division I',
                'Customer Service Center Division II',
                'Customer Service Center Division III',
                'IHSS Operations Division'
            ],
            'Bureau of Workforce Services North': [
                'North Division I',
                'North Division II', 
                'North Division III'
            ],
            'Bureau of Workforce Services South': [
                'South Division I',
                'South Division II',
                'South Division III'
            ],
            'Bureau of Special Operations': [
                'Program Compliance Division'
            ],
            'DPSS Administration': [
                'Financial Management Division'
            ]
        };

        // Define division to sections relationships
        const divisionToSections = {
            'Financial Management Division': ['Budget Planning & Control', 'Budget Policy'],
            'General Services Division': ['Property Management'],
            'Contract Administration and Monitoring Division': ['Contracts I', 'Contracts II', 'Contracts III', 'Contracts IV'],
            'Fiscal Operations Division': ['Budget Planning & Control'],
            'Information Technology Services Division': ['Field Technical Support', 'Security & Storage Management'],
            'Bureau of Technology Services Administration': ['CalSAWs Project'],
            'Human Capital Management Branch': ['DPSS Academy'],
            'Workforce Safety Leave & Disability Comp Branch': ['Leave Management and Disability Compliance'],
            'CalWORKs & GAIN Program Division': ['CalWORKs Program Section', 'GAIN Program Policy Section I', 'GAIN Program Policy Section II', 'GAIN Program Policy Section III'],
            'General Relief & CalFresh Program Division': ['CalFresh Program Section I', 'CalFresh Program Section II', 'General Relief & CAPI Section'],
            'Medi-Cal / IHSS Program Division': ['Medi-Cal Program Section'],
            'Program Compliance Division': [],
            'Customer Service Center Division I': ['Customer Service Center I - El Monte'],
            'Customer Service Center Division II': ['Customer Service Center II - La Cienega'],
            'Customer Service Center Division III': ['Customer Service Center IV', 'Customer Service Center V', 'Customer Service Center VI', 'Customer Service Center VII', 'Customer Service Center VIII'],
            'IHSS Operations Division': ['IHSS Call Center Main - Industry'],
            'North Division I': ['Norwalk'],
            'North Division II': ['Norwalk'],
            'North Division III': ['Norwalk'],
            'South Division I': ['Norwalk'],
            'South Division II': ['Norwalk'],
            'South Division III': ['Norwalk']
        };

        // Define office assignments for different organizational units
        const bureauToOffices = {
            'Bureau of Administrative Services': ['Crossroads Main', 'Fiscal Operations Division', 'Fiscal Management Division'],
            'Bureau of Technology Services': ['Crossroads Main'],
            'Bureau of Human Resources': ['Bureau of Human Resources'],
            'Bureau of Program & Policy': ['Crossroads Main'],
            'Bureau of Customer Service Centers': ['Crossroads East', 'Crossroads West', 'Crossroads Main', 'IHSS Crossroads'],
            'Bureau of Workforce Services North': ['Crossroads East'],
            'Bureau of Workforce Services South': ['Crossroads West'],
            'Bureau of Special Operations': ['Crossroads Main'],
            'DPSS Administration': ['Crossroads Main']
        };

        // Generate all valid combinations
        Object.keys(bureauToDivisions).forEach(bureau => {
            const divisions = bureauToDivisions[bureau];
            const offices = bureauToOffices[bureau] || ['Crossroads Main'];
            
            divisions.forEach(division => {
                const sections = divisionToSections[division] || [];
                
                // If division has sections, create paths for each section
                if (sections.length > 0) {
                    sections.forEach(section => {
                        offices.forEach(office => {
                            realPaths.push({
                                office: office,
                                bureau: bureau,
                                division: division,
                                section: section
                            });
                        });
                    });
                } else {
                    // If no sections defined, create path with division only
                    offices.forEach(office => {
                        realPaths.push({
                            office: office,
                            bureau: bureau,
                            division: division,
                            section: null // Set to null instead of string to avoid rendering issues
                        });
                    });
                }
            });
        });
        
        console.log(`🏢 Generated ${realPaths.length} organizational paths from CSV data structure`);
        return realPaths;
    }

    attachEventListeners() {
        // Wait for auth manager
        const checkForAuthManager = () => {
            if (window.authManager) {
                window.authManager.onAuthStateChanged((isAuthenticated) => {
                    this.updateButtonVisibility(isAuthenticated);
                });
                
                // Initial check
                this.updateButtonVisibility(this.isUserAuthenticated());
            } else {
                setTimeout(checkForAuthManager, 100);
            }
        };
        checkForAuthManager();
        
        // Modal open/close
        const viewerBtn = document.getElementById('organizationalViewerBtn');
        const modal = document.getElementById('organizationalViewerModal');
        const closeBtn = document.getElementById('organizationalViewerClose');
        
        if (viewerBtn) {
            viewerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.closeModal();
            }
        });
        
        // Search input
        const searchInput = document.getElementById('organizationalViewerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderPaths();
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('organizationalViewerSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderPaths();
            });
        }
    }

    updateButtonVisibility(isAuthenticated) {
        const viewerBtn = document.getElementById('organizationalViewerBtn');
        if (viewerBtn) {
            viewerBtn.style.display = isAuthenticated ? 'inline-block' : 'none';
        }
    }

    openModal() {
        // Check if user is authenticated
        if (!this.isUserAuthenticated()) {
            alert('Please log in to view organizational paths.');
            return;
        }
        
        const modal = document.getElementById('organizationalViewerModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            this.isVisible = true;
            this.renderPaths();
            
            // Focus search input
            const searchInput = document.getElementById('organizationalViewerSearch');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('organizationalViewerModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            this.isVisible = false;
            
            // Clear search
            const searchInput = document.getElementById('organizationalViewerSearch');
            if (searchInput) {
                searchInput.value = '';
                this.searchTerm = '';
            }
        }
    }

    isUserAuthenticated() {
        // Primary method: Check if authManager has current user and auth token
        if (window.authManager && window.authManager.currentUser && window.authManager.authToken) {
            return true;
        }
        
        // Fallback: Check if template auth exists in localStorage
        const templateAuth = localStorage.getItem('templateAuth');
        return !!(templateAuth && templateAuth !== 'null');
    }

    renderPaths() {
        // Filter paths based on search term
        this.filteredPaths = this.allPaths.filter(path => {
            if (!this.searchTerm) return true;
            
            const searchLower = this.searchTerm.toLowerCase();
            return path.office.toLowerCase().includes(searchLower) ||
                   path.bureau.toLowerCase().includes(searchLower) ||
                   path.division.toLowerCase().includes(searchLower) ||
                   path.section.toLowerCase().includes(searchLower);
        });

        // Sort paths
        this.sortPaths();
        
        // Update path count
        this.updatePathCount();
        
        // Render paths list
        const pathsList = document.getElementById('organizationalViewerPaths');
        if (!pathsList) return;
        
        pathsList.innerHTML = '';
        
        if (this.filteredPaths.length === 0) {
            pathsList.innerHTML = '<div class="no-paths-message">No organizational paths found matching your search.</div>';
            return;
        }
        
        // Render based on sort method
        if (this.currentSort === 'office') {
            this.renderGroupedPaths(pathsList);
        } else {
            this.renderFlatPaths(pathsList);
        }
    }

    sortPaths() {
        switch (this.currentSort) {
            case 'office':
                this.filteredPaths.sort((a, b) => {
                    const officeCompare = a.office.localeCompare(b.office);
                    if (officeCompare !== 0) return officeCompare;
                    return a.bureau.localeCompare(b.bureau);
                });
                break;
            case 'alphabetical':
                this.filteredPaths.sort((a, b) => {
                    return `${a.office} ${a.bureau} ${a.division} ${a.section}`.localeCompare(
                        `${b.office} ${b.bureau} ${b.division} ${b.section}`
                    );
                });
                break;
            case 'complete':
                this.filteredPaths.sort((a, b) => {
                    if (a.complete && !b.complete) return -1;
                    if (!a.complete && b.complete) return 1;
                    return a.office.localeCompare(b.office);
                });
                break;
            case 'confidence':
                this.filteredPaths.sort((a, b) => {
                    const confidenceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
                    const confidenceCompare = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
                    if (confidenceCompare !== 0) return confidenceCompare;
                    return a.office.localeCompare(b.office);
                });
                break;
        }
    }

    renderGroupedPaths(pathsList) {
        let currentOffice = '';
        
        this.filteredPaths.forEach((path, index) => {
            // Add office header if changed
            if (path.office !== currentOffice) {
                currentOffice = path.office;
                const headerDiv = document.createElement('div');
                headerDiv.className = 'viewer-group-header';
                headerDiv.innerHTML = `
                    <span>${currentOffice}</span>
                    <span class="group-count">${this.filteredPaths.filter(p => p.office === currentOffice).length} paths</span>
                `;
                pathsList.appendChild(headerDiv);
            }
            
            this.renderSinglePath(pathsList, path, index);
        });
    }

    renderFlatPaths(pathsList) {
        this.filteredPaths.forEach((path, index) => {
            this.renderSinglePath(pathsList, path, index);
        });
    }

    renderSinglePath(pathsList, path, index) {
        const pathItem = document.createElement('div');
        pathItem.className = 'viewer-path-item organizational-path';
        
        // Show select button for paths with at least 3 levels (Office → Bureau → Division)
        const hasMinimumLevels = path.officeValue && path.bureauValue && path.divisionValue;
        const selectButtonHtml = hasMinimumLevels ? 
            `<button class="viewer-select-btn organizational-select" data-path-id="${path.id}" title="Select this organizational path">Select Path</button>` : 
            '';
        
        // Confidence indicator
        const confidenceClass = `confidence-${path.confidence}`;
        const confidenceText = path.confidence.charAt(0).toUpperCase() + path.confidence.slice(1);
        
        pathItem.innerHTML = `
            <div class="viewer-path-content">
                <span class="viewer-path-level ${path.office === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.office) ? 'highlighted' : ''}">${path.office}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.bureau === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.bureau) ? 'highlighted' : ''}">${path.bureau}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.division === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.division) ? 'highlighted' : ''}">${path.division}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.section === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.section) ? 'highlighted' : ''}">${path.section}</span>
            </div>
            <div class="viewer-path-actions">
                <div class="viewer-path-status ${path.complete ? 'complete' : 'incomplete'}"></div>
                <div class="confidence-indicator ${confidenceClass}" title="Data confidence: ${confidenceText}">${confidenceText}</div>
                ${selectButtonHtml}
            </div>
        `;
        
        // Add click event listener to select button if it exists
        if (hasMinimumLevels) {
            const selectBtn = pathItem.querySelector('.viewer-select-btn');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectOrganizationalPath(path);
                });
            }
        }
        
        pathsList.appendChild(pathItem);
    }

    shouldHighlight(text) {
        if (!this.searchTerm || text === '[missing]' || text === '[no section]') return false;
        return text.toLowerCase().includes(this.searchTerm.toLowerCase());
    }

    updatePathCount() {
        const pathCount = document.getElementById('organizationalViewerCount');
        if (pathCount) {
            const total = this.allPaths.length;
            const filtered = this.filteredPaths.length;
            pathCount.textContent = filtered === total ? 
                `${total} paths` : 
                `${filtered} of ${total} paths`;
        }
    }

    selectOrganizationalPath(pathData) {
        // Check if we're in modal context (for ticket modal viewers)
        if (this.modalContext === 'ticketModal') {
            if (window.ticketQueueManager && typeof window.ticketQueueManager.selectModalOrganizationalPath === 'function') {
                window.ticketQueueManager.selectModalOrganizationalPath(pathData);
                this.closeModal();
                return;
            }
        }

        // Validate that we have at least the minimum required data (3 levels: Office → Bureau → Division)
        if (!pathData.officeValue || !pathData.bureauValue || !pathData.divisionValue) {
            console.error('Cannot select path - missing required organizational levels:', pathData);
            this.showSelectionFeedback('Please select a path with at least Office, Bureau, and Division.', 'error');
            return;
        }

        const hasSection = pathData.sectionValue && pathData.sectionValue !== '[missing]' && pathData.sectionValue !== '[no section]';

        try {
            // Show immediate feedback
            this.showSelectionFeedback('Populating organizational fields...', 'success');

            // Get organizational dropdown elements
            const officeSelect = document.getElementById('office');
            const bureauSelect = document.getElementById('bureau');
            const divisionSelect = document.getElementById('division');
            const sectionSelect = document.getElementById('section');
            
            if (!officeSelect || !bureauSelect || !divisionSelect) {
                console.error('Organizational select elements not found');
                this.showSelectionFeedback('Form elements not found. Please refresh the page.', 'error');
                return;
            }

            // 1. Set office dropdown
            if (pathData.officeValue) {
                officeSelect.value = pathData.officeValue;
                officeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 2. Set bureau dropdown (with small delay)
            setTimeout(() => {
                if (pathData.bureauValue) {
                    bureauSelect.value = pathData.bureauValue;
                    bureauSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // 3. Set division dropdown (with small delay)
                setTimeout(() => {
                    if (pathData.divisionValue) {
                        divisionSelect.value = pathData.divisionValue;
                        divisionSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    // 4. Set section dropdown if available (with small delay)
                    setTimeout(() => {
                        if (sectionSelect && hasSection) {
                            sectionSelect.value = pathData.sectionValue;
                            sectionSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        // 5. Apply visual feedback highlighting
                        this.highlightSelectedFields();

                        // 6. Show success feedback with confidence warning if needed
                        let message = 'Organizational path selected successfully!';
                        if (pathData.confidence === 'low' || pathData.confidence === 'medium') {
                            message += ` (${pathData.confidence.charAt(0).toUpperCase() + pathData.confidence.slice(1)} confidence - please verify)`;
                        }
                        
                        this.showSelectionFeedback(message, pathData.confidence === 'low' ? 'warning' : 'success');

                        // 7. Close modal after successful selection
                        setTimeout(() => {
                            this.closeModal();
                        }, 2000);

                    }, 100);
                }, 100);
            }, 100);
            
        } catch (error) {
            console.error('❌ Error selecting organizational path:', error);
            this.showSelectionFeedback('Error selecting organizational path. Please try again.', 'error');
        }
    }

    highlightSelectedFields() {
        // Get all the organizational form fields that were populated
        const fieldsToHighlight = [
            document.getElementById('office'),
            document.getElementById('bureau'),
            document.getElementById('division'),
            document.getElementById('section')
        ].filter(field => field && field.value && field.value !== ''); // Only highlight fields with values

        // Apply IT Staff highlighting style (yellow highlighting)
        fieldsToHighlight.forEach(field => {
            // Clear any existing highlighting classes first
            field.classList.remove('populated-from-template', 'populated-from-it-staff', 'field-highlight-user-submitted', 
                                  'field-highlight-it-enhancement', 'field-highlight-template-loaded');
            
            // Add the IT staff populated styling
            field.classList.add('populated-from-it-staff');
        });

        // Remove highlighting after 3 seconds
        setTimeout(() => {
            fieldsToHighlight.forEach(field => {
                if (field) {
                    field.classList.remove('populated-from-it-staff');
                }
            });
        }, 3000);
    }

    showSelectionFeedback(message, type = 'success') {
        // Find or create feedback element
        let feedbackElement = document.getElementById('organizationalViewerFeedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'organizationalViewerFeedback';
            feedbackElement.className = 'viewer-feedback';
            
            const modal = document.getElementById('organizationalViewerModal');
            if (modal) {
                modal.querySelector('.viewer-header')?.appendChild(feedbackElement);
            }
        }
        
        // Update feedback
        feedbackElement.textContent = message;
        feedbackElement.className = `viewer-feedback ${type}`;
        feedbackElement.style.display = 'block';
        
        // Hide after delay (longer for warnings)
        const delay = type === 'warning' ? 4000 : 2000;
        setTimeout(() => {
            if (feedbackElement) {
                feedbackElement.style.display = 'none';
            }
        }, delay);
    }
}

// Initialize and export
export function initializeOrganizationalViewer() {
    console.log('🏢 Initializing Organizational Viewer...');
    return new OrganizationalViewer();
}

// Auto-initialize on window load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.organizationalViewer) {
            window.organizationalViewer = initializeOrganizationalViewer();
            console.log('✅ OrganizationalViewer globally available');
        }
    }, 400);
});