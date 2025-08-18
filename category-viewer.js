// Category Viewer Module - Read-only category path viewer for authenticated users
class CategoryViewer {
    constructor() {
        this.categories = null;
        this.allPaths = [];
        this.filteredPaths = [];
        this.currentSort = 'category';
        this.searchTerm = '';
        this.isVisible = false;
        
        this.init();
    }

    async init() {
        try {
            // Load categories data
            await this.loadCategories();
            
            // Generate all paths
            this.generateAllPaths();
            
            // Attach event listeners
            this.attachEventListeners();
            
            // Ensure modal is hidden on initialization
            this.ensureModalHidden();
            
            console.log('Category Viewer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Category Viewer:', error);
        }
    }

    ensureModalHidden() {
        const modal = document.getElementById('categoryViewerModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            this.isVisible = false;
        }
    }

    async loadCategories() {
        // Import categories data
        const module = await import('../settings/categories.js');
        this.categories = {
            categories: module.categories,
            requestTypes: module.requestTypes,
            subcategories: module.subcategories,
            subSubcategories: module.subSubcategories,
            implementationTypes: module.implementationTypes,
            categoryNames: module.categoryNames,
            subcategoryNames: module.subcategoryNames,
            subSubcategoryNames: module.subSubcategoryNames
        };
        
        console.log('Categories loaded for viewer:', Object.keys(this.categories.categories).length, 'categories');
    }

    generateAllPaths() {
        this.allPaths = [];
        
        // Generate all possible paths from the categories data
        Object.entries(this.categories.categories).forEach(([categoryKey, categoryName]) => {
            const requestTypes = this.categories.requestTypes[categoryKey] || [];
            
            if (requestTypes.length === 0) {
                // Category with no request types
                this.allPaths.push({
                    id: `${categoryKey}`,
                    category: categoryName,
                    requestType: '[missing]',
                    subcategory: '[missing]',
                    subSubcategory: '[missing]',
                    implementation: '[missing]',
                    complete: false,
                    categoryKey,
                    requestTypeKey: null,
                    subcategoryKey: null,
                    subSubcategoryKey: null,
                    implementationKey: null
                });
                return;
            }
            
            requestTypes.forEach(requestTypeObj => {
                const requestTypeKey = requestTypeObj.value;
                const requestTypeName = requestTypeObj.text;
                
                // Get subcategories for this category and request type
                const categorySubcategories = this.categories.subcategories[categoryKey] || {};
                const subcategories = categorySubcategories[requestTypeKey] || [];
                
                if (subcategories.length === 0) {
                    // Request type with no subcategories
                    this.allPaths.push({
                        id: `${categoryKey}-${requestTypeKey}`,
                        category: categoryName,
                        requestType: requestTypeName,
                        subcategory: '[missing]',
                        subSubcategory: '[missing]',
                        implementation: '[missing]',
                        complete: false,
                        categoryKey,
                        requestTypeKey,
                        subcategoryKey: null,
                        subSubcategoryKey: null,
                        implementationKey: null
                    });
                    return;
                }
                
                subcategories.forEach(subcategoryObj => {
                    const subcategoryKey = subcategoryObj.value;
                    const subcategoryName = subcategoryObj.text;
                    const subSubcategories = this.categories.subSubcategories[subcategoryKey] || [];
                    
                    if (subSubcategories.length === 0) {
                        // Subcategory with no sub-subcategories
                        this.allPaths.push({
                            id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}`,
                            category: categoryName,
                            requestType: requestTypeName,
                            subcategory: subcategoryName,
                            subSubcategory: '[missing]',
                            implementation: '[missing]',
                            complete: false,
                            categoryKey,
                            requestTypeKey,
                            subcategoryKey,
                            subSubcategoryKey: null,
                            implementationKey: null
                        });
                        return;
                    }
                    
                    subSubcategories.forEach(subSubcategoryObj => {
                        const subSubcategoryKey = subSubcategoryObj.value;
                        const subSubcategoryName = subSubcategoryObj.text;
                        const implementations = this.categories.implementationTypes[subSubcategoryKey] || [];
                        
                        if (implementations.length === 0) {
                            // Sub-subcategory with no implementations
                            this.allPaths.push({
                                id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}-${subSubcategoryKey}`,
                                category: categoryName,
                                requestType: requestTypeName,
                                subcategory: subcategoryName,
                                subSubcategory: subSubcategoryName,
                                implementation: '[missing]',
                                complete: false,
                                categoryKey,
                                requestTypeKey,
                                subcategoryKey,
                                subSubcategoryKey,
                                implementationKey: null
                            });
                            return;
                        }
                        
                        implementations.forEach(implementationObj => {
                            const implementationKey = implementationObj.value;
                            const implementationName = implementationObj.text;
                            
                            // Complete path
                            this.allPaths.push({
                                id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}-${subSubcategoryKey}-${implementationKey}`,
                                category: categoryName,
                                requestType: requestTypeName,
                                subcategory: subcategoryName,
                                subSubcategory: subSubcategoryName,
                                implementation: implementationName,
                                complete: true,
                                categoryKey,
                                requestTypeKey,
                                subcategoryKey,
                                subSubcategoryKey,
                                implementationKey
                            });
                        });
                    });
                });
            });
        });
        
        console.log('Generated paths for viewer:', this.allPaths.length);
    }

    attachEventListeners() {
        // Check authentication status and show/hide button
        this.updateButtonVisibility();
        
        // Listen for auth state changes (multiple ways)
        document.addEventListener('authStateChanged', () => {
            this.updateButtonVisibility();
        });
        
        // Also listen via authManager callback if available
        if (window.authManager && window.authManager.onAuthStateChanged) {
            window.authManager.onAuthStateChanged((isAuthenticated, user) => {
                this.updateButtonVisibility();
            });
        } else {
            // If authManager isn't available yet, keep checking for it
            const checkForAuthManager = () => {
                if (window.authManager && window.authManager.onAuthStateChanged) {
                    window.authManager.onAuthStateChanged((isAuthenticated, user) => {
                        this.updateButtonVisibility();
                    });
                } else {
                    setTimeout(checkForAuthManager, 500);
                }
            };
            checkForAuthManager();
        }
        
        // Modal open/close
        const viewerBtn = document.getElementById('categoryViewerBtn');
        const modal = document.getElementById('categoryViewerModal');
        const closeBtn = document.getElementById('categoryViewerClose');
        
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
        const searchInput = document.getElementById('categoryViewerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderPaths();
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('categoryViewerSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderPaths();
            });
        }
    }

    openModal() {
        // Check if user is authenticated
        if (!this.isUserAuthenticated()) {
            alert('Please log in to view category paths.');
            return;
        }
        
        const modal = document.getElementById('categoryViewerModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            this.isVisible = true;
            this.renderPaths();
            
            // Focus search input
            const searchInput = document.getElementById('categoryViewerSearch');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('categoryViewerModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            this.isVisible = false;
            
            // Clear search
            const searchInput = document.getElementById('categoryViewerSearch');
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
        
        // Secondary method: Check if user controls are visible
        const userControls = document.getElementById('headerUserControls');
        if (userControls && userControls.style.display === 'flex') {
            return true;
        }
        
        // Tertiary method: Check if auth controls are hidden (means user is logged in)
        const authControls = document.getElementById('headerAuthControls');
        if (authControls && authControls.style.display === 'none') {
            return true;
        }
        
        return false;
    }

    updateButtonVisibility() {
        const viewerBtn = document.getElementById('categoryViewerBtn');
        const isAuthenticated = this.isUserAuthenticated();
        
        if (viewerBtn) {
            if (isAuthenticated) {
                viewerBtn.style.display = 'flex';
            } else {
                viewerBtn.style.display = 'none';
            }
        }
    }

    applySearchAndSort() {
        // Filter by search term
        this.filteredPaths = this.allPaths.filter(path => {
            if (!this.searchTerm) return true;
            
            const searchLower = this.searchTerm.toLowerCase();
            return path.category.toLowerCase().includes(searchLower) ||
                   path.requestType.toLowerCase().includes(searchLower) ||
                   path.subcategory.toLowerCase().includes(searchLower) ||
                   path.subSubcategory.toLowerCase().includes(searchLower) ||
                   path.implementation.toLowerCase().includes(searchLower);
        });
        
        // Sort the filtered paths
        switch (this.currentSort) {
            case 'alphabetical':
                this.filteredPaths.sort((a, b) => {
                    const pathA = `${a.category} → ${a.requestType} → ${a.subcategory} → ${a.subSubcategory} → ${a.implementation}`;
                    const pathB = `${b.category} → ${b.requestType} → ${b.subcategory} → ${b.subSubcategory} → ${b.implementation}`;
                    return pathA.localeCompare(pathB);
                });
                break;
            case 'completion':
                this.filteredPaths.sort((a, b) => {
                    if (a.complete && !b.complete) return -1;
                    if (!a.complete && b.complete) return 1;
                    return a.category.localeCompare(b.category);
                });
                break;
            case 'missing':
                this.filteredPaths.sort((a, b) => {
                    if (!a.complete && b.complete) return -1;
                    if (a.complete && !b.complete) return 1;
                    return a.category.localeCompare(b.category);
                });
                break;
            case 'category':
            default:
                this.filteredPaths.sort((a, b) => {
                    if (a.category !== b.category) {
                        return a.category.localeCompare(b.category);
                    }
                    if (a.requestType !== b.requestType) {
                        return a.requestType.localeCompare(b.requestType);
                    }
                    return a.subcategory.localeCompare(b.subcategory);
                });
                break;
        }
    }

    renderPaths() {
        const pathsList = document.getElementById('categoryViewerPathsList');
        if (!pathsList) return;
        
        // Apply search filter and sorting
        this.applySearchAndSort();
        
        pathsList.innerHTML = '';
        
        if (this.currentSort === 'category') {
            this.renderGroupedPaths(pathsList);
        } else {
            this.renderFlatPaths(pathsList);
        }
        
        // Update path count
        this.updatePathCount();
    }

    renderGroupedPaths(pathsList) {
        let currentCategory = '';
        
        this.filteredPaths.forEach((path, index) => {
            // Add category header if changed
            if (path.category !== currentCategory) {
                currentCategory = path.category;
                const headerDiv = document.createElement('div');
                headerDiv.className = 'viewer-group-header';
                headerDiv.textContent = currentCategory;
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
        pathItem.className = 'viewer-path-item';
        
        // Show select button for paths with at least 4 levels (Category → Request Type → Subcategory → Sub-subcategory)
        const hasMinimumLevels = path.categoryKey && path.requestTypeKey && path.subcategoryKey && path.subSubcategoryKey;
        const selectButtonHtml = hasMinimumLevels ? 
            `<button class="viewer-select-btn" data-path-id="${path.id}" title="Select this category path">Select Path</button>` : 
            '';
        
        pathItem.innerHTML = `
            <div class="viewer-path-content">
                <span class="viewer-path-level ${path.category === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.category) ? 'highlighted' : ''}">${path.category}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.requestType === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.requestType) ? 'highlighted' : ''}">${path.requestType}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.subcategory === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.subcategory) ? 'highlighted' : ''}">${path.subcategory}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.subSubcategory === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.subSubcategory) ? 'highlighted' : ''}">${path.subSubcategory}</span>
                <span class="viewer-path-arrow">→</span>
                <span class="viewer-path-level ${path.implementation === '[missing]' ? 'missing' : ''} ${this.shouldHighlight(path.implementation) ? 'highlighted' : ''}">${path.implementation}</span>
            </div>
            <div class="viewer-path-actions">
                <div class="viewer-path-status ${path.complete ? 'complete' : 'incomplete'}"></div>
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
                    this.selectCategoryPath(path);
                });
            }
        }
        
        pathsList.appendChild(pathItem);
    }

    shouldHighlight(text) {
        if (!this.searchTerm || text === '[missing]') return false;
        return text.toLowerCase().includes(this.searchTerm.toLowerCase());
    }

    updatePathCount() {
        const pathCount = document.getElementById('categoryViewerCount');
        if (pathCount) {
            const total = this.allPaths.length;
            const filtered = this.filteredPaths.length;
            pathCount.textContent = filtered === total ? 
                `${total} paths` : 
                `${filtered} of ${total} paths`;
        }
    }

    selectCategoryPath(pathData) {
        // Check if we're in modal context (for ticket modal viewers)
        if (this.modalContext === 'ticketModal') {
            if (window.ticketQueueManager && typeof window.ticketQueueManager.selectModalCategoryPath === 'function') {
                window.ticketQueueManager.selectModalCategoryPath(pathData);
                this.closeModal();
                return;
            }
        }

        // Validate that we have at least the minimum required keys (4 levels)
        if (!pathData.categoryKey || !pathData.requestTypeKey || 
            !pathData.subcategoryKey || !pathData.subSubcategoryKey) {
            console.error('Cannot select path - missing required levels:', pathData);
            this.showSelectionFeedback('Please select a path with at least 4 levels.', 'error');
            return;
        }

        const hasImplementation = pathData.implementationKey && pathData.implementationKey !== null;

        try {
            // Show immediate feedback
            this.showSelectionFeedback('Populating form...', 'success');

            // 1. Set main category dropdown
            const categorySelect = document.getElementById('requestCategory');
            
            if (!categorySelect) {
                console.error('Category select element not found');
                this.showSelectionFeedback('Form elements not found. Please refresh the page.', 'error');
                return;
            }

            categorySelect.value = pathData.categoryKey;
            
            // Trigger change event to ensure proper cascade
            categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 2. Trigger dropdown cascade updates with delays for proper loading
            if (window.updateRequestTypes && typeof window.updateRequestTypes === 'function') {
                window.updateRequestTypes();
            } else {
                console.error('updateRequestTypes function not available');
            }
            
            // 3. Set request type after category updates
            setTimeout(() => {
                const requestTypeSelect = document.getElementById('subsectionType');
                
                if (requestTypeSelect && pathData.requestTypeKey) {
                    requestTypeSelect.value = pathData.requestTypeKey;
                    requestTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    if (window.updateSubcategories && typeof window.updateSubcategories === 'function') {
                        window.updateSubcategories();
                    }
                    
                    // 4. Set subcategory after request type updates
                    setTimeout(() => {
                        const subcategorySelect = document.getElementById('subcategoryType');
                        
                        if (subcategorySelect && pathData.subcategoryKey) {
                            subcategorySelect.value = pathData.subcategoryKey;
                            subcategorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            if (window.updateSubSubcategories && typeof window.updateSubSubcategories === 'function') {
                                window.updateSubSubcategories();
                            }
                            
                            // 5. Set sub-subcategory after subcategory updates
                            setTimeout(() => {
                                const subSubcategorySelect = document.getElementById('subSubcategoryType');
                                
                                if (subSubcategorySelect && pathData.subSubcategoryKey) {
                                    subSubcategorySelect.value = pathData.subSubcategoryKey;
                                    subSubcategorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                                    
                                    if (window.updateImplementationTypes && typeof window.updateImplementationTypes === 'function') {
                                        window.updateImplementationTypes();
                                    }
                                    
                                    // 6. Set implementation type after sub-subcategory updates (if available)
                                    setTimeout(() => {
                                        const implementationSelect = document.getElementById('implementationType');
                                        
                                        if (implementationSelect && hasImplementation && pathData.implementationKey) {
                                            implementationSelect.value = pathData.implementationKey;
                                            implementationSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                        
                                        // 7. Apply visual feedback highlighting
                                        this.highlightSelectedFields();
                                        
                                        // 8. Show success feedback
                                        const message = hasImplementation ? 
                                            'Category path selected successfully!' : 
                                            'Category path selected successfully! (No implementation level)';
                                        this.showSelectionFeedback(message, 'success');
                                        
                                        // 9. Close modal after successful selection
                                        setTimeout(() => {
                                            this.closeModal();
                                        }, 1500);
                                        
                                    }, 200);
                                }
                            }, 200);
                        }
                    }, 200);
                }
            }, 200);
            
        } catch (error) {
            console.error('❌ Error selecting category path:', error);
            this.showSelectionFeedback('Error selecting category path. Please try again.', 'error');
        }
    }

    highlightSelectedFields() {
        // Get all the form fields that were populated
        const fieldsToHighlight = [
            document.getElementById('requestCategory'),
            document.getElementById('subsectionType'),
            document.getElementById('subcategoryType'),
            document.getElementById('subSubcategoryType'),
            document.getElementById('implementationType')
        ].filter(field => field && field.value && field.value !== ''); // Only highlight fields with values

        // Apply IT Staff highlighting style (yellow highlighting)
        fieldsToHighlight.forEach(field => {
            if (field) {
                field.classList.add('populated-from-it-staff');
                
                // Remove highlight after 3 seconds (matching existing behavior)
                setTimeout(() => {
                    field.classList.remove('populated-from-it-staff');
                }, 3000);
            }
        });

        console.log('✨ Applied highlighting to', fieldsToHighlight.length, 'fields');
    }

    showSelectionFeedback(message, type = 'success') {
        // Create or update feedback element
        let feedbackElement = document.getElementById('categoryViewerFeedback');
        
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'categoryViewerFeedback';
            feedbackElement.className = 'category-viewer-feedback';
            
            // Insert feedback element in the modal header
            const modalHeader = document.querySelector('.category-viewer-header');
            if (modalHeader) {
                modalHeader.appendChild(feedbackElement);
            }
        }
        
        // Set message and type
        feedbackElement.textContent = message;
        feedbackElement.className = `category-viewer-feedback ${type}`;
        feedbackElement.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            feedbackElement.style.display = 'none';
        }, 3000);
    }
}

// Initialize the category viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        window.categoryViewer = new CategoryViewer();
        
        // Also check on window load in case DOM ready fired too early
        window.addEventListener('load', () => {
            if (window.categoryViewer) {
                window.categoryViewer.updateButtonVisibility();
            }
        });
        
        // Periodically check auth status in case events don't fire
        setInterval(() => {
            if (window.categoryViewer) {
                window.categoryViewer.updateButtonVisibility();
            }
        }, 2000);
    }, 1000);
});