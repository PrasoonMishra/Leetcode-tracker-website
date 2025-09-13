// Global variables
let allProblems = [];
let filteredProblems = [];
let currentPage = 1;
const problemsPerPage = 20;
let currentSort = { column: 'weighted_frequency', direction: 'desc' };
let solvedProblems = new Set(); // Track solved problems
let selectedTags = new Set();
let selectedCompanies = new Set();
let selectedDifficulties = new Set();

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    loadSolvedProblems();
    await loadProblems();
    initializeEventListeners();
    initializeFilters();
    displayProblems();
    updateStatistics();
    setupTabNavigation();
    initializeTheme();
});

// Load solved problems from localStorage
function loadSolvedProblems() {
    const saved = localStorage.getItem('solvedProblems');
    if (saved) {
        solvedProblems = new Set(JSON.parse(saved));
    }
}

// Save solved problems to localStorage
function saveSolvedProblems() {
    localStorage.setItem('solvedProblems', JSON.stringify([...solvedProblems]));
}

// Toggle problem solved status
function toggleProblemSolved(problemId) {
    if (solvedProblems.has(problemId)) {
        solvedProblems.delete(problemId);
    } else {
        solvedProblems.add(problemId);
    }
    saveSolvedProblems();
    updateStatistics();
    displayProblems(); // Refresh to show updated styling
}

// Load problems from JSON file
async function loadProblems() {
    try {
        const response = await fetch('enhanced_leetcode_problems.json');
        allProblems = await response.json();
        filteredProblems = [...allProblems];
        console.log(`Loaded ${allProblems.length} problems`);
    } catch (error) {
        console.error('Error loading problems:', error);
        showError('Failed to load problems data');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    document.getElementById('search').addEventListener('input', debounce(filterProblems, 300));
    
    // Filter controls
    document.getElementById('status-filter').addEventListener('change', filterProblems);
    document.getElementById('company-count-filter').addEventListener('input', updateCompanyCountFilter);
    document.getElementById('frequency-filter').addEventListener('input', updateFrequencyFilter);
    
    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleDifficulty(btn.dataset.difficulty));
    });
    
    // Custom multi-select for tags and companies
    setupCustomMultiSelect('tags');
    setupCustomMultiSelect('companies');
    
    // Action buttons
    document.getElementById('clear-filters').addEventListener('click', clearAllFilters);
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    document.getElementById('go-to-page').addEventListener('click', goToSpecificPage);
    document.getElementById('page-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') goToSpecificPage();
    });
    
    // Table sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            sortProblems(column);
        });
    });
}

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Toggle theme between light and dark
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Update theme icon
function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Toggle select all problems
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.problem-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const problemId = checkbox.dataset.problemId;
        if (selectAll.checked) {
            solvedProblems.add(problemId);
        } else {
            solvedProblems.delete(problemId);
        }
    });
    
    saveSolvedProblems();
    updateStatistics();
    displayProblems();
}

// Initialize filter options
function initializeFilters() {
    populateCustomMultiSelect('tags');
    populateCustomMultiSelect('companies');
    updateCompanyCountFilter();
    updateFrequencyFilter();
}

// Toggle difficulty selection
function toggleDifficulty(difficulty) {
    const btn = document.querySelector(`[data-difficulty="${difficulty}"]`);
    
    if (selectedDifficulties.has(difficulty)) {
        selectedDifficulties.delete(difficulty);
        btn.classList.remove('active');
    } else {
        selectedDifficulties.add(difficulty);
        btn.classList.add('active');
    }
    
    filterProblems();
}

// Setup custom multi-select dropdown
function setupCustomMultiSelect(type) {
    const selectedContainer = document.getElementById(`selected-${type}`);
    const dropdown = document.getElementById(`${type === 'tags' ? 'tag' : 'company'}-dropdown`);
    
    selectedContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove')) {
            const value = e.target.parentElement.dataset.value;
            if (type === 'tags') {
                selectedTags.delete(value);
            } else {
                selectedCompanies.delete(value);
            }
            updateSelectedDisplay(type);
            filterProblems();
            return;
        }
        
        dropdown.classList.toggle('show');
        selectedContainer.classList.toggle('active');
        
        // Toggle dropdown-active class on wrapper for z-index elevation
        const wrapper = selectedContainer.closest('.multi-select-wrapper');
        if (dropdown.classList.contains('show')) {
            wrapper.classList.add('dropdown-active');
            document.body.classList.add('dropdown-open');
        } else {
            wrapper.classList.remove('dropdown-active');
            // Only remove body class if no other dropdowns are open
            if (!document.querySelector('.dropdown-content.show')) {
                document.body.classList.remove('dropdown-open');
            }
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!selectedContainer.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            selectedContainer.classList.remove('active');
            
            // Remove dropdown-active class from wrapper
            const wrapper = selectedContainer.closest('.multi-select-wrapper');
            wrapper.classList.remove('dropdown-active');
            
            // Only remove body class if no other dropdowns are open
            if (!document.querySelector('.dropdown-content.show')) {
                document.body.classList.remove('dropdown-open');
            }
        }
    });
    
    // Mobile-specific: Close dropdown when clicking on the close button area
    dropdown.addEventListener('click', (e) => {
        // If clicking in the top area (close button), close the dropdown
        const rect = dropdown.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // Check if click is in the top 50px (close button area)
        if (clickY < 50 && window.innerWidth <= 768) {
            dropdown.classList.remove('show');
            selectedContainer.classList.remove('active');
            
            const wrapper = selectedContainer.closest('.multi-select-wrapper');
            wrapper.classList.remove('dropdown-active');
            
            if (!document.querySelector('.dropdown-content.show')) {
                document.body.classList.remove('dropdown-open');
            }
            e.stopPropagation();
        }
    });
}

// Populate custom multi-select options
function populateCustomMultiSelect(type) {
    const dropdown = document.getElementById(`${type === 'tags' ? 'tag' : 'company'}-dropdown`);
    const items = new Set();
    
    allProblems.forEach(problem => {
        if (type === 'tags') {
            problem.tags.forEach(tag => items.add(tag));
        } else {
            problem.companies.forEach(company => items.add(company));
        }
    });
    
    // Filter out items that don't have any problems
    const filteredItems = Array.from(items).filter(item => {
        return allProblems.some(problem => {
            if (type === 'tags') {
                return problem.tags.includes(item);
            } else {
                return problem.companies.includes(item);
            }
        });
    }).sort();
    
    dropdown.innerHTML = filteredItems.map(item => {
        const displayName = type === 'companies' ? formatCompanyName(item) : item;
        return `<div class="dropdown-item" data-value="${item}">${displayName}</div>`;
    }).join('');
    
    // Add click handlers to dropdown items
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const value = item.dataset.value;
            const selectedSet = type === 'tags' ? selectedTags : selectedCompanies;
            
            if (selectedSet.has(value)) {
                selectedSet.delete(value);
                item.classList.remove('selected');
            } else {
                selectedSet.add(value);
                item.classList.add('selected');
            }
            
            updateSelectedDisplay(type);
            filterProblems();
        });
    });
}

// Update selected items display
function updateSelectedDisplay(type) {
    const container = document.getElementById(`selected-${type}`);
    const selectedSet = type === 'tags' ? selectedTags : selectedCompanies;
    const dropdown = document.getElementById(`${type === 'tags' ? 'tag' : 'company'}-dropdown`);
    
    if (selectedSet.size === 0) {
        container.innerHTML = `<span class="placeholder">Select ${type}...</span>`;
    } else {
        container.innerHTML = Array.from(selectedSet).map(item => {
            const displayName = type === 'companies' ? formatCompanyName(item) : item;
            const className = type === 'tags' ? 'selected-tag' : 'selected-company';
            return `<span class="${className}" data-value="${item}">
                ${displayName}
                <span class="remove">×</span>
            </span>`;
        }).join('');
    }
    
    // Update dropdown item states
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        if (selectedSet.has(item.dataset.value)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Go to specific page
function goToSpecificPage() {
    const pageInput = document.getElementById('page-input');
    const pageNumber = parseInt(pageInput.value);
    const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
    
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        displayProblems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        pageInput.value = currentPage;
        showError(`Page number must be between 1 and ${totalPages}`);
    }
}

// Update company count filter display
function updateCompanyCountFilter() {
    const slider = document.getElementById('company-count-filter');
    const display = document.getElementById('company-count-value');
    display.textContent = `${slider.value}+`;
    filterProblems();
}

// Update frequency filter display
function updateFrequencyFilter() {
    const slider = document.getElementById('frequency-filter');
    const display = document.getElementById('frequency-value');
    display.textContent = `${parseFloat(slider.value).toFixed(1)}+`;
    filterProblems();
}

// Filter problems based on all active filters
function filterProblems() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const minCompanyCount = parseInt(document.getElementById('company-count-filter').value);
    const minFrequency = parseFloat(document.getElementById('frequency-filter').value);
    
    filteredProblems = allProblems.filter(problem => {
        // Search filter
        const matchesSearch = !searchTerm || 
            problem.title.toLowerCase().includes(searchTerm) ||
            problem.problem_id.includes(searchTerm);
        
        // Status filter
        const isSolved = solvedProblems.has(problem.problem_id);
        const matchesStatus = statusFilter === '' || 
            (statusFilter === 'solved' && isSolved) ||
            (statusFilter === 'unsolved' && !isSolved);
        
        // Difficulty filter
        const matchesDifficulty = selectedDifficulties.size === 0 || 
            selectedDifficulties.has(problem.difficulty);
        
        // Company count filter
        const matchesCompanyCount = problem.company_count >= minCompanyCount;
        
        // Frequency filter
        const matchesFrequency = problem.weighted_frequency >= minFrequency;
        
        // Tag filter
        const matchesTags = selectedTags.size === 0 || 
            Array.from(selectedTags).some(tag => problem.tags.includes(tag));
        
        // Company filter
        const matchesCompanies = selectedCompanies.size === 0 || 
            Array.from(selectedCompanies).some(company => problem.companies.includes(company));
        
        return matchesSearch && matchesStatus && matchesDifficulty && matchesCompanyCount && 
               matchesFrequency && matchesTags && matchesCompanies;
    });
    
    currentPage = 1;
    displayProblems();
    updateStatistics();
}

// Sort problems by column
function sortProblems(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }
    
    filteredProblems.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (currentSort.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    updateSortIcons();
    displayProblems();
}

// Update sort icons in table headers
function updateSortIcons() {
    document.querySelectorAll('.sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const activeHeader = document.querySelector(`[data-sort="${currentSort.column}"] i`);
    if (activeHeader) {
        activeHeader.className = `fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`;
    }
}

// Display problems in table
function displayProblems() {
    const tbody = document.getElementById('problems-tbody');
    const startIndex = (currentPage - 1) * problemsPerPage;
    const endIndex = startIndex + problemsPerPage;
    const pageProblems = filteredProblems.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageProblems.forEach(problem => {
        const row = createProblemRow(problem);
        tbody.appendChild(row);
    });
    
    // Also update mobile cards
    displayProblemsAsMobileCards();
    
    updatePagination();
}

// Display problems in mobile card format
function displayProblemsAsMobileCards() {
    const startIndex = (currentPage - 1) * problemsPerPage;
    const endIndex = startIndex + problemsPerPage;
    const problemsToShow = filteredProblems.slice(startIndex, endIndex);
    
    let mobileCardsContainer = document.getElementById('mobile-cards-container');
    if (!mobileCardsContainer) {
        console.error('Mobile cards container not found');
        return;
    }
    
    mobileCardsContainer.innerHTML = problemsToShow.map(problem => {
        const isSolved = solvedProblems.has(problem.problem_id);
        const companiesHtml = problem.companies.slice(0, 3).map(company => 
            `<div class="company-logo-item-mobile" title="${formatCompanyName(company)}">
                <div class="company-logo">
                    <img src="https://logo.clearbit.com/${getDomainFromCompany(company)}" 
                         alt="${formatCompanyName(company)}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="company-fallback" style="display: none;">
                        ${getCompanyInitials(company)}
                    </div>
                </div>
            </div>`
        ).join(' ');
        const companiesJson = JSON.stringify(problem.companies).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const titleEscaped = problem.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const moreCompanies = problem.companies.length > 3 ? 
            `<div class="company-logo-item-mobile company-more" onclick="showAllCompanies('${problem.problem_id}', '${titleEscaped}', '${companiesJson}')" title="Click to see all ${problem.companies.length} companies">
                <div class="company-logo">
                    <div class="company-fallback" style="display: flex;">
                        ${problem.companies.length - 3 > 9 ? '9+' : `+${problem.companies.length - 3}`}
                    </div>
                </div>
            </div>` : '';
        
        return `
            <div class="problem-card ${isSolved ? 'solved' : ''}">
                <div class="problem-card-header">
                    <div class="problem-title">${problem.title}</div>
                    <input type="checkbox" class="problem-checkbox-mobile" 
                           ${isSolved ? 'checked' : ''} 
                           onchange="toggleProblemSolved('${problem.problem_id}')">
                </div>
                
                <div class="problem-meta">
                    <span class="difficulty-${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
                    <span class="company-count">${problem.company_count} companies</span>
                    <span class="frequency-score">${problem.weighted_frequency.toFixed(2)} freq</span>
                </div>
                
                <div class="problem-tags">
                    ${problem.tags.slice(0, 4).map(tag => `<span class="tag" title="${tag}">${tag}</span>`).join(' ')}
                    ${problem.tags.length > 4 ? `<span class="tag tag-more" onclick="showAllTags('${problem.problem_id}', '${titleEscaped}', '${JSON.stringify(problem.tags).replace(/"/g, '&quot;').replace(/'/g, '&#39;')}')" title="Click to see all tags">+${problem.tags.length - 4}</span>` : ''}
                </div>
                
                <div class="problem-companies" style="margin-top: 0.5rem;">
                    <div class="companies-list-mobile">
                        ${companiesHtml}${moreCompanies}
                    </div>
                </div>
                
                <div class="problem-actions-mobile">
                    <a href="${problem.url}" target="_blank" class="action-link">
                        <i class="fas fa-external-link-alt"></i> Solve
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Create a table row for a problem
function createProblemRow(problem) {
    const row = document.createElement('tr');
    const isSolved = solvedProblems.has(problem.problem_id);
    
    if (isSolved) {
        row.classList.add('problem-solved');
    }
    
    // Show only first 3 companies, with expandable option for more
    const visibleCompanies = problem.companies.slice(0, 3);
    const hiddenCompanies = problem.companies.slice(3);
    
    let companiesHtml = visibleCompanies.map(company => 
        `<div class="company-logo-item" title="${formatCompanyName(company)}">
            <div class="company-logo">
                <img src="https://logo.clearbit.com/${getDomainFromCompany(company)}" 
                     alt="${formatCompanyName(company)}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="company-fallback" style="display: none;">
                    ${getCompanyInitials(company)}
                </div>
            </div>
        </div>`
    ).join(' ');
    
    if (hiddenCompanies.length > 0) {
        const companiesJson = JSON.stringify(problem.companies).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const titleEscaped = problem.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const moreText = hiddenCompanies.length > 9 ? '9+' : `+${hiddenCompanies.length}`;
        companiesHtml += ` <div class="company-logo-item company-more" onclick="showAllCompanies('${problem.problem_id}', '${titleEscaped}', '${companiesJson}')" title="Click to see all ${problem.companies.length} companies">
            <div class="company-logo">
                <div class="company-fallback" style="display: flex;">
                    ${moreText}
                </div>
            </div>
        </div>`;
    }
    
    row.innerHTML = `
        <td>
            <input type="checkbox" class="problem-checkbox" 
                   data-problem-id="${problem.problem_id}" 
                   ${isSolved ? 'checked' : ''}
                   onchange="toggleProblemSolved('${problem.problem_id}')">
        </td>
        <td>
            <strong>${problem.title}</strong>
            <br>
            <small style="color: var(--text-muted);">ID: ${problem.problem_id}</small>
        </td>
        <td>
            <span class="difficulty-${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
        </td>
        <td>
            <span class="company-count">${problem.company_count}</span>
        </td>
        <td>
            <span class="frequency-score">${problem.weighted_frequency.toFixed(2)}</span>
        </td>
        <td>
            ${problem.tags.map(tag => `<span class="tag" title="${tag}">${tag}</span>`).join(' ')}
        </td>
        <td>
            <div class="companies-list">
                ${companiesHtml}
            </div>
        </td>
        <td>
            <a href="${problem.url.trim()}" target="_blank" class="action-link">
                <i class="fas fa-external-link-alt"></i> Solve
            </a>
        </td>
    `;
    
    return row;
}

// Show all companies modal
function showAllCompanies(problemId, title, companies) {
    // Handle if companies is passed as a string (from HTML onclick)
    if (typeof companies === 'string') {
        try {
            companies = JSON.parse(companies.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        } catch (e) {
            console.error('Error parsing companies:', e);
            return;
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 'company-modal';
    
    modal.innerHTML = `
        <div class="company-modal-content">
            <button class="company-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <h3>All Companies for: ${title.replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</h3>
            <div class="companies-list-modal">
                ${companies.map(company => 
                    `<div class="company-logo-item-modal" title="${formatCompanyName(company)}">
                        <div class="company-logo">
                            <img src="https://logo.clearbit.com/${getDomainFromCompany(company)}" 
                                 alt="${formatCompanyName(company)}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="company-fallback" style="display: none;">
                                ${getCompanyInitials(company)}
                            </div>
                        </div>
                        <span class="company-name">${formatCompanyName(company)}</span>
                    </div>`
                ).join('')}
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Show all tags modal
function showAllTags(problemId, title, tags) {
    // Handle if tags is passed as a string (from HTML onclick)
    if (typeof tags === 'string') {
        try {
            tags = JSON.parse(tags.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        } catch (e) {
            console.error('Error parsing tags:', e);
            return;
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 'company-modal'; // Reuse the same modal styling
    
    modal.innerHTML = `
        <div class="company-modal-content">
            <button class="company-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <h3>All Tags for: ${title.replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</h3>
            <div class="companies-list">
                ${tags.map(tag => 
                    `<span class="tag">${tag}</span>`
                ).join(' ')}
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Make function globally available
window.showAllCompanies = showAllCompanies;
window.showAllTags = showAllTags;
window.toggleProblemSolved = toggleProblemSolved;

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
    
    // Update page input
    const pageInput = document.getElementById('page-input');
    pageInput.max = totalPages;
    pageInput.value = currentPage;
    
    // Generate page numbers
    generatePageNumbers(totalPages);
}

// Generate page number buttons
function generatePageNumbers(totalPages) {
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    // First page
    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageButton(totalPages);
    }
}

function addPageButton(pageNum) {
    const pageNumbers = document.getElementById('page-numbers');
    const button = document.createElement('button');
    button.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    button.addEventListener('click', () => {
        currentPage = pageNum;
        displayProblems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    pageNumbers.appendChild(button);
}

function addEllipsis() {
    const pageNumbers = document.getElementById('page-numbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-number ellipsis';
    ellipsis.textContent = '...';
    pageNumbers.appendChild(ellipsis);
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayProblems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Update statistics
function updateStatistics() {
    const totalProblems = allProblems.length;
    const uniqueCompanies = new Set();
    allProblems.forEach(p => p.companies.forEach(c => uniqueCompanies.add(c)));
    
    const totalSolved = solvedProblems.size;
    const solvedEasy = allProblems.filter(p => 
        solvedProblems.has(p.problem_id) && p.difficulty === 'Easy'
    ).length;
    const solvedMedium = allProblems.filter(p => 
        solvedProblems.has(p.problem_id) && p.difficulty === 'Medium'
    ).length;
    const solvedHard = allProblems.filter(p => 
        solvedProblems.has(p.problem_id) && p.difficulty === 'Hard'
    ).length;
    
    const completionRate = totalProblems > 0 ? 
        ((totalSolved / totalProblems) * 100).toFixed(1) : 0;
    
    // Update all statistics
    document.getElementById('total-problems').textContent = totalProblems.toLocaleString();
    document.getElementById('solved-problems').textContent = totalSolved.toLocaleString();
    document.getElementById('solved-easy').textContent = solvedEasy.toLocaleString();
    document.getElementById('solved-medium').textContent = solvedMedium.toLocaleString();
    document.getElementById('solved-hard').textContent = solvedHard.toLocaleString();
    document.getElementById('unique-companies').textContent = uniqueCompanies.size;
    document.getElementById('filtered-problems').textContent = filteredProblems.length.toLocaleString();
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
    
    // Update progress ring
    updateProgressRing(completionRate);
}

function updateProgressRing(percentage) {
    const circle = document.querySelector('.progress-fill');
    const text = document.querySelector('.progress-text');
    
    if (circle && text) {
        const radius = 36; // Based on the 80px SVG with stroke-width 8
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        text.textContent = `${percentage}% Complete`;
    }
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('search').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('company-count-filter').value = 1;
    document.getElementById('frequency-filter').value = 0;
    
    // Clear difficulty buttons
    selectedDifficulties.clear();
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Clear tags and companies
    selectedTags.clear();
    selectedCompanies.clear();
    updateSelectedDisplay('tags');
    updateSelectedDisplay('companies');
    
    updateCompanyCountFilter();
    updateFrequencyFilter();
    filterProblems();
}

// Export filtered data
function exportFilteredData() {
    const dataStr = JSON.stringify(filteredProblems, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `filtered_leetcode_problems_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Setup tab navigation
function setupTabNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    // Load tab-specific content
    if (tabName === 'insights') {
        loadStatisticsCharts();
    }
}

// Load statistics charts
function loadStatisticsCharts() {
    loadDifficultyChart();
    loadCompaniesFrequency();
}

// Load difficulty distribution chart
function loadDifficultyChart() {
    const ctx = document.getElementById('difficulty-chart').getContext('2d');
    const difficulties = { Easy: 0, Medium: 0, Hard: 0 };
    
    allProblems.forEach(problem => {
        difficulties[problem.difficulty]++;
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(difficulties),
            datasets: [{
                data: Object.values(difficulties),
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load tags frequency
function loadTagsFrequency() {
    const tagsCount = {};
    
    allProblems.forEach(problem => {
        problem.tags.forEach(tag => {
            tagsCount[tag] = (tagsCount[tag] || 0) + 1;
        });
    });
    
    const sortedTags = Object.entries(tagsCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);
    
    const container = document.getElementById('tags-frequency');
    container.innerHTML = sortedTags.map(([tag, count]) => `
        <div class="frequency-item">
            <span class="frequency-name">${tag}</span>
            <span class="frequency-count">${count}</span>
        </div>
    `).join('');
}

// Load companies frequency with logos
function loadCompaniesFrequency() {
    const companiesCount = {};
    
    allProblems.forEach(problem => {
        problem.companies.forEach(company => {
            companiesCount[company] = (companiesCount[company] || 0) + 1;
        });
    });
    
    const sortedCompanies = Object.entries(companiesCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 12);
    
    const container = document.getElementById('companies-frequency');
    container.innerHTML = sortedCompanies.map(([company, count]) => {
        const companyName = formatCompanyName(company);
        const logoUrl = getCompanyLogo(company);
        return `
            <div class="company-frequency-item">
                <div class="company-info">
                    <div class="company-logo">
                        <img src="${logoUrl}" alt="${companyName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="company-fallback" style="display: none;">
                            ${companyName.charAt(0)}
                        </div>
                    </div>
                    <span class="company-name">${companyName}</span>
                </div>
                <span class="company-count">${count}</span>
            </div>
        `;
    }).join('');
}

// Get company logo URL
function getCompanyLogo(company) {
    const logoMap = {
        'google': 'https://logo.clearbit.com/google.com',
        'amazon': 'https://logo.clearbit.com/amazon.com',
        'microsoft': 'https://logo.clearbit.com/microsoft.com',
        'apple': 'https://logo.clearbit.com/apple.com',
        'facebook': 'https://logo.clearbit.com/facebook.com',
        'meta': 'https://logo.clearbit.com/meta.com',
        'netflix': 'https://logo.clearbit.com/netflix.com',
        'uber': 'https://logo.clearbit.com/uber.com',
        'airbnb': 'https://logo.clearbit.com/airbnb.com',
        'linkedin': 'https://logo.clearbit.com/linkedin.com',
        'twitter': 'https://logo.clearbit.com/twitter.com',
        'snapchat': 'https://logo.clearbit.com/snapchat.com',
        'tesla': 'https://logo.clearbit.com/tesla.com',
        'bloomberg': 'https://logo.clearbit.com/bloomberg.com',
        'goldman-sachs': 'https://logo.clearbit.com/goldmansachs.com',
        'jp-morgan': 'https://logo.clearbit.com/jpmorganchase.com',
        'morgan-stanley': 'https://logo.clearbit.com/morganstanley.com',
        'visa': 'https://logo.clearbit.com/visa.com',
        'mastercard': 'https://logo.clearbit.com/mastercard.com',
        'paypal': 'https://logo.clearbit.com/paypal.com',
        'stripe': 'https://logo.clearbit.com/stripe.com',
        'salesforce': 'https://logo.clearbit.com/salesforce.com',
        'oracle': 'https://logo.clearbit.com/oracle.com',
        'cisco': 'https://logo.clearbit.com/cisco.com',
        'intel': 'https://logo.clearbit.com/intel.com',
        'nvidia': 'https://logo.clearbit.com/nvidia.com',
        'adobe': 'https://logo.clearbit.com/adobe.com',
        'spotify': 'https://logo.clearbit.com/spotify.com',
        'dropbox': 'https://logo.clearbit.com/dropbox.com',
        'slack': 'https://logo.clearbit.com/slack.com',
        'zoom': 'https://logo.clearbit.com/zoom.us',
        'twitch': 'https://logo.clearbit.com/twitch.tv',
        'reddit': 'https://logo.clearbit.com/reddit.com',
        'pinterest': 'https://logo.clearbit.com/pinterest.com',
        'square': 'https://logo.clearbit.com/squareup.com',
        'robinhood': 'https://logo.clearbit.com/robinhood.com',
        'coinbase': 'https://logo.clearbit.com/coinbase.com'
    };
    
    const normalizedCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return logoMap[normalizedCompany] || `https://logo.clearbit.com/${normalizedCompany}.com`;
}

// Load company distribution chart
function loadCompanyDistributionChart() {
    const ctx = document.getElementById('company-distribution-chart').getContext('2d');
    const distribution = {};
    
    allProblems.forEach(problem => {
        const count = problem.company_count;
        const range = count <= 5 ? '1-5' : count <= 10 ? '6-10' : count <= 20 ? '11-20' : '20+';
        distribution[range] = (distribution[range] || 0) + 1;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(distribution),
            datasets: [{
                label: 'Number of Problems',
                data: Object.values(distribution),
                backgroundColor: '#667eea',
                borderColor: '#5a6fd8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Utility functions
function formatCompanyName(company) {
    return company.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getDomainFromCompany(company) {
    // Map common company names to their domains
    const companyDomains = {
        'google': 'google.com',
        'facebook': 'facebook.com',
        'amazon': 'amazon.com',
        'microsoft': 'microsoft.com',
        'apple': 'apple.com',
        'netflix': 'netflix.com',
        'uber': 'uber.com',
        'lyft': 'lyft.com',
        'airbnb': 'airbnb.com',
        'linkedin': 'linkedin.com',
        'twitter': 'twitter.com',
        'salesforce': 'salesforce.com',
        'oracle': 'oracle.com',
        'adobe': 'adobe.com',
        'paypal': 'paypal.com',
        'tesla': 'tesla.com',
        'spotify': 'spotify.com',
        'dropbox': 'dropbox.com',
        'slack': 'slack.com',
        'zoom': 'zoom.us',
        'mongodb': 'mongodb.com',
        'redis': 'redis.io',
        'atlassian': 'atlassian.com',
        'github': 'github.com',
        'gitlab': 'gitlab.com',
        'docker': 'docker.com',
        'kubernetes': 'kubernetes.io',
        'vmware': 'vmware.com',
        'ibm': 'ibm.com',
        'intel': 'intel.com',
        'nvidia': 'nvidia.com',
        'amd': 'amd.com',
        'cisco': 'cisco.com',
        'dell': 'dell.com',
        'hp': 'hp.com',
        'tiktok': 'tiktok.com',
        'bytedance': 'bytedance.com',
        'alibaba': 'alibaba.com',
        'tencent': 'tencent.com',
        'baidu': 'baidu.com',
        'jpmorgan': 'jpmorgan.com',
        'goldman-sachs': 'goldmansachs.com',
        'morgan-stanley': 'morganstanley.com',
        'capital-one': 'capitalone.com',
        'american-express': 'americanexpress.com',
        'visa': 'visa.com',
        'mastercard': 'mastercard.com',
        'blackrock': 'blackrock.com',
        'citadel': 'citadel.com'
    };
    
    return companyDomains[company] || `${company}.com`;
}

function getCompanyInitials(company) {
    const formatted = formatCompanyName(company);
    const words = formatted.split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return words.map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
