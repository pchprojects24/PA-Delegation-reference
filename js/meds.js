// Medication reference page logic (search, rendering, PDF export, tools).
// Depends on data/meds-data.js and data/at-sea-notes.js being loaded first.

const container = document.getElementById('medicationContainer');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const expandAllBtn = document.getElementById('expandAllBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryNav = document.getElementById('categoryNav');
const emptyClearBtn = document.getElementById('emptyClearBtn');
const backToTopBtn = document.getElementById('backToTopBtn');
const exportViewBtn = document.getElementById('exportViewBtn');
const pocketCardBtn = document.getElementById('pocketCardBtn');
const pocketCard = document.getElementById('pocketCard');
const printTitle = document.getElementById('printTitle');
const printMeta = document.getElementById('printMeta');
const originalDocumentTitle = document.title;
// Searches matching this many medications or fewer open automatically;
// larger result sets stay collapsed so the list remains scannable.
const autoExpandLimit = 5;
const detailSectionOrder = [
    "At Sea",
    "Mechanism & Expected Effect",
    "Adverse Effects",
    "Adverse Effects & Serious Harms",
    "Drug Interactions",
    "Monitoring",
    "Patient Counselling",
    "Alternatives",
    "Emergency & Escalation",
    "Delegation & Documentation",
    "Administration",
    "Clinical Pearls",
    "Additional Notes"
];
const defaultPlainText = "Not specified";
const defaultRichText = "<p>Not specified.</p>";
const suggestionBlurDelay = 100;
const highlightExcludedTags = ['SCRIPT', 'STYLE', 'MARK'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ensurePlainText = (value, fallback = defaultPlainText) =>
    String(value ?? "").trim() || fallback;
const stripHtml = (value = "") => {
    const parsedDocument = new DOMParser().parseFromString(String(value), "text/html");
    return parsedDocument.body.textContent.replace(/\s+/g, " ").trim();
};
const ensureRichText = (value, fallback = defaultRichText) =>
    stripHtml(value) ? value : fallback;
const sortDetailSections = (details = []) =>
    [...details].sort((a, b) => {
        const aIndex = detailSectionOrder.indexOf(a.title);
        const bIndex = detailSectionOrder.indexOf(b.title);
        const safeAIndex = aIndex === -1 ? detailSectionOrder.length : aIndex;
        const safeBIndex = bIndex === -1 ? detailSectionOrder.length : bIndex;
        return safeAIndex - safeBIndex || a.title.localeCompare(b.title);
    });
// Anti-infectives suggested in "Alternatives" sections that are not on
// this delegated list get a "not in guide" tag so they aren't mistaken
// for options in stock.
const notInGuideDrugs = [
    "piperacillin-tazobactam", "vancomycin", "meropenem", "ertapenem", "cefepime",
    "cefotaxime", "cefadroxil", "dicloxacillin", "daptomycin", "fosfomycin",
    "tinidazole", "fidaxomicin", "foscarnet", "ganciclovir", "moxifloxacin",
    "levofloxacin", "ofloxacin", "Bicillin L-A", "ivermectin", "terbinafine",
    "itraconazole", "ketoconazole", "miconazole", "nystatin", "fusidic acid",
    "retapamulin", "malathion", "spinosad", "lindane", "crotamiton", "pyrethrins"
];
const notInGuidePattern = new RegExp(
    `\\b(${notInGuideDrugs.map((name) => escapeRegex(name)).join("|")})\\b`,
    "gi"
);
const notInGuideTag =
    '<span class="not-in-guide ml-1 align-middle whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded px-1">not in guide</span>';
const tagNotInGuide = (detail) =>
    detail.title === "Alternatives"
        ? { ...detail, content: String(detail.content).replace(notInGuidePattern, `$1${notInGuideTag}`) }
        : detail;
const withAtSeaNotes = (med) => {
    const entry = atSeaNotes[med.name];
    if (!entry) return med;
    return {
        ...med,
        dutyImpact: Boolean(entry.duty),
        details: [{ title: "At Sea", icon: "anchor", content: ul(entry.notes) }, ...(med.details || [])]
    };
};
const normalizeMedicationData = (data) =>
    data.map((category) => ({
        ...category,
        category: ensurePlainText(category.category, "Uncategorized"),
        medications: (category.medications || []).map((med) => withAtSeaNotes(med)).map((med) => ({
            ...med,
            name: ensurePlainText(med.name, "Unnamed medication"),
            forms: ensurePlainText(med.forms),
            ind: ensurePlainText(med.ind),
            dose: ensureRichText(med.dose),
            contra: ensureRichText(med.contra),
            protip: ensureRichText(med.protip),
            details: sortDetailSections(
                (med.details || []).map((detail) => ({
                    ...detail,
                    title: ensurePlainText(detail.title, "Additional Notes"),
                    icon: String(detail.icon ?? "").trim(),
                    content: ensureRichText(detail.content)
                })).map(tagNotInGuide)
            )
        }))
    }));
const normalizedMedData = normalizeMedicationData(medData);
const totalMedicationCount = normalizedMedData.reduce(
    (count, category) => count + category.medications.length,
    0
);
let activeSuggestionIndex = -1;
let visibleSuggestions = [];
let currentSearchTerm = "";
let currentSearchTokens = [];
const getSearchTokens = (value) =>
    value
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
// Short alphanumeric terms (≤3 characters, e.g. "NS", "UTI", "TXA") only
// match at the start of a word, so they don't hit inside longer words
// ("solution") but still work while typing ("ami" → amiodarone).
const isShortToken = (token) => token.length <= 3 && /^[a-z0-9]+$/.test(token);
const tokenPatternSource = (token) =>
    isShortToken(token) ? `\\b${escapeRegex(token)}` : escapeRegex(token);
const matchesToken = (text, token) =>
    isShortToken(token) ? new RegExp(tokenPatternSource(token), "i").test(text) : text.includes(token);
const matchesTokens = (text, tokens) =>
    tokens.every((token) => matchesToken(String(text).toLowerCase(), token));
const getMedicationSearchText = (categoryName, med) =>
    [
        categoryName,
        med.name,
        searchAliases[med.name],
        med.forms,
        med.ind,
        stripHtml(med.dose),
        stripHtml(med.contra),
        stripHtml(med.protip),
        ...(med.details || []).flatMap((detail) => [
            detail.title,
            stripHtml(detail.content)
        ])
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
const searchIndex = normalizedMedData.flatMap((category) => {
    const meds = category.medications.map((med) => ({
        type: "medication",
        label: med.name,
        searchValue: med.name,
        meta: `${category.category} • ${stripHtml(med.ind)}`,
        searchText: getMedicationSearchText(category.category, med),
        aliasTokens: getSearchTokens(searchAliases[med.name] || "")
    }));

    return [
        {
            type: "category",
            label: category.category,
            searchValue: category.category,
            meta: `${category.medications.length} medications`,
            searchText: `${category.category} ${meds.map((item) => item.label).join(" ")}`.toLowerCase()
        },
        ...meds
    ];
});
const scoreSuggestion = (item, tokens) => {
    const label = item.label.toLowerCase();
    return tokens.reduce((score, token) => {
        if (label === token) return score + 10;
        if (label.startsWith(token)) return score + 7;
        if (label.includes(token)) return score + 4;
        // Brand names, abbreviations and main uses (data/search-aliases.js)
        // rank ahead of passing mentions elsewhere in an entry.
        if (item.aliasTokens && item.aliasTokens.includes(token)) return score + 6;
        if (item.aliasTokens && item.aliasTokens.some((alias) => alias.startsWith(token))) return score + 3;
        if (matchesToken(item.searchText, token)) return score + 1;
        return score;
    }, item.type === "medication" ? 2 : 0);
};
let allExpanded = false;

function setAllExpanded(expanded) {
    const contents = document.querySelectorAll('.accordion-content');

    allExpanded = expanded;

    contents.forEach((content) => {
        const button = content.previousElementSibling;
        const icon =
            (button && button.querySelector('.chevron-icon')) ||
            (button && button.querySelector('[data-lucide="chevron-down"]')) ||
            (button && button.querySelector('svg'));

        if (expanded) {
            content.classList.add('expanded');
            content.setAttribute('aria-hidden', 'false');
            content.removeAttribute('inert');
            content.style.paddingTop = '1rem';
            content.style.paddingBottom = '1rem';
            if (icon) icon.style.transform = 'rotate(180deg)';
            if (button) button.setAttribute('aria-expanded', 'true');
        } else {
            content.classList.remove('expanded');
            content.setAttribute('aria-hidden', 'true');
            content.setAttribute('inert', '');
            content.style.paddingTop = '0';
            content.style.paddingBottom = '0';
            if (icon) icon.style.transform = 'rotate(0deg)';
            if (button) button.setAttribute('aria-expanded', 'false');
        }
    });

    expandAllBtn.textContent = expanded ? "Collapse all" : "Expand all";
}

function setSuggestionsVisibility(visible) {
    searchSuggestions.classList.toggle('hidden', !visible);
    searchInput.setAttribute('aria-expanded', visible ? 'true' : 'false');
}

function updateResultsCount(totalMeds) {
    if (!currentSearchTokens.length) {
        resultsCount.textContent = `Showing all ${totalMedicationCount} medications`;
        return;
    }

    const noun = totalMeds === 1 ? "medication" : "medications";
    resultsCount.textContent =
        totalMeds > autoExpandLimit
            ? `${totalMeds} matching ${noun} — tap one to open it`
            : `${totalMeds} matching ${noun}`;
}

function highlightMatches(root, tokens) {
    if (!tokens.length) return;

    const uniqueTokens = [...new Set(tokens)].sort((a, b) => b.length - a.length);
    const escapedTokens = uniqueTokens.map((token) => tokenPatternSource(token));
    const testPattern = new RegExp(`(${escapedTokens.join("|")})`, "i");
    const replacePattern = new RegExp(`(${escapedTokens.join("|")})`, "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (highlightExcludedTags.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#searchSuggestions')) return NodeFilter.FILTER_REJECT;

            return testPattern.test(node.nodeValue)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        }
    });
    const nodesToReplace = [];

    while (walker.nextNode()) {
        nodesToReplace.push(walker.currentNode);
    }

    nodesToReplace.forEach((node) => {
        const fragment = document.createDocumentFragment();
        const text = node.nodeValue;
        let lastIndex = 0;
        let match;

        replacePattern.lastIndex = 0;

        while ((match = replacePattern.exec(text)) !== null) {
            const [matchedText] = match;

            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = matchedText;
            fragment.appendChild(mark);
            lastIndex = match.index + matchedText.length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    });
}

function getSearchSuggestions(tokens) {
    if (!tokens.length) return [];

    const seen = new Set();

    return searchIndex
        .filter((item) => matchesTokens(item.searchText, tokens))
        .sort((a, b) => scoreSuggestion(b, tokens) - scoreSuggestion(a, tokens) || a.label.localeCompare(b.label))
        .filter((item) => {
            const key = `${item.type}:${item.searchValue}`;

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        })
        .slice(0, 8);
}

function renderSuggestions() {
    if (!visibleSuggestions.length || !currentSearchTokens.length) {
        searchSuggestions.innerHTML = '';
        setSuggestionsVisibility(false);
        return;
    }

    searchSuggestions.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'max-h-80 overflow-y-auto py-1';

    visibleSuggestions.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion-item flex w-full items-start justify-between gap-3 px-4 py-3 text-left';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', index === activeSuggestionIndex ? 'true' : 'false');

        if (index === activeSuggestionIndex) {
            button.classList.add('active');
        }

        button.innerHTML = `
            <div class="min-w-0">
                <div class="suggestion-label text-sm font-semibold text-slate-900"></div>
                <div class="suggestion-meta mt-0.5 text-xs text-slate-500 truncate"></div>
            </div>
            <span class="suggestion-type shrink-0 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600"></span>
        `;
        button.querySelector('.suggestion-label').textContent = item.label;
        button.querySelector('.suggestion-meta').textContent = item.meta;
        button.querySelector('.suggestion-type').textContent = item.type;
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => {
            searchInput.value = item.searchValue;
            applySearch(item.searchValue);
            setSuggestionsVisibility(false);
            searchInput.focus();
        });
        list.appendChild(button);
    });

    searchSuggestions.appendChild(list);
    setSuggestionsVisibility(true);
}

function scrollActiveSuggestionIntoView() {
    const activeSuggestion = searchSuggestions.querySelector('button[aria-selected="true"]');

    if (activeSuggestion) {
        activeSuggestion.scrollIntoView({ block: 'nearest' });
    }
}

function applySearch(rawValue) {
    currentSearchTerm = rawValue.trim();
    currentSearchTokens = getSearchTokens(currentSearchTerm);
    visibleSuggestions = getSearchSuggestions(currentSearchTokens);
    activeSuggestionIndex = -1;

    clearSearchBtn.classList.toggle('hidden', !rawValue.trim());

    renderQuickAccess();

    if (!currentSearchTokens.length) {
        renderMedications(normalizedMedData);
        setAllExpanded(false);
        renderSuggestions();
        return;
    }

    const filteredData = normalizedMedData
        .map((category) => {
            const categoryMatch = matchesTokens(category.category.toLowerCase(), currentSearchTokens);
            const matchedMeds = category.medications.filter((med) => {
                if (categoryMatch) return true;

                return matchesTokens(
                    getMedicationSearchText(category.category, med),
                    currentSearchTokens
                );
            });

            return {
                ...category,
                medications: matchedMeds
            };
        })
        .filter((category) => category.medications.length > 0);

    renderMedications(filteredData);
    renderSuggestions();

    const matchCount = filteredData.reduce(
        (count, category) => count + category.medications.length,
        0
    );

    if (matchCount > 0 && matchCount <= autoExpandLimit) {
        requestAnimationFrame(() => setAllExpanded(true));
    } else {
        setAllExpanded(false);
    }
}

// Per-category icon + accent styling; categories not listed fall back to the default.
const defaultCategoryStyle = { icon: 'folder-tree', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', accent: 'bg-slate-400' };
const categoryStyles = {
    "Cardiovascular": { icon: 'heart-pulse', iconBg: 'bg-rose-50', iconColor: 'text-rose-600', accent: 'bg-rose-500' },
    "Dermatological": { icon: 'hand', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', accent: 'bg-orange-500' },
    "Ear-Nose-Throat (ENT)": { icon: 'ear', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', accent: 'bg-amber-500' },
    "Endocrine & Metabolic": { icon: 'flask-conical', iconBg: 'bg-teal-50', iconColor: 'text-teal-600', accent: 'bg-teal-500' },
    "Gastrointestinal": { icon: 'pill', iconBg: 'bg-lime-50', iconColor: 'text-lime-600', accent: 'bg-lime-500' },
    "Infectious Disease": { icon: 'bug', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', accent: 'bg-emerald-500' },
    "Immunological & Vaccines": { icon: 'syringe', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600', accent: 'bg-cyan-500' },
    "Musculoskeletal & Connective Tissue": { icon: 'bone', iconBg: 'bg-stone-100', iconColor: 'text-stone-600', accent: 'bg-stone-500' },
    "Neurological": { icon: 'brain', iconBg: 'bg-violet-50', iconColor: 'text-violet-600', accent: 'bg-violet-500' },
    "Obstetrical & Gynecological": { icon: 'baby', iconBg: 'bg-pink-50', iconColor: 'text-pink-600', accent: 'bg-pink-500' },
    "Ophthalmic": { icon: 'eye', iconBg: 'bg-sky-50', iconColor: 'text-sky-600', accent: 'bg-sky-500' },
    "Respiratory": { icon: 'wind', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', accent: 'bg-blue-500' },
    "Smoking Cessation": { icon: 'cigarette-off', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', accent: 'bg-slate-500' },
    "IV Fluids, Blood Products, Electrolytes": { icon: 'droplets', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', accent: 'bg-indigo-500' },
    "Controlled Substances — Narcotics": { icon: 'shield-alert', iconBg: 'bg-red-50', iconColor: 'text-red-600', accent: 'bg-red-500' },
    "Controlled Substances — Benzodiazepines": { icon: 'moon', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', accent: 'bg-purple-500' }
};
const getCategoryStyle = (name) => categoryStyles[name] || defaultCategoryStyle;
const getCategoryId = (name) =>
    `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function renderCategoryNav(data) {
    categoryNav.innerHTML = '';
    categoryNav.classList.toggle('hidden', data.length < 2);

    data.forEach((category) => {
        const link = document.createElement('a');
        link.href = `#${getCategoryId(category.category)}`;
        link.className =
            'shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-full px-3 py-1.5 transition-colors';
        link.textContent = category.category;

        const count = document.createElement('span');
        count.className = 'text-slate-400 font-medium';
        count.textContent = category.medications.length;
        link.appendChild(count);

        categoryNav.appendChild(link);
    });
}

// Render function
function renderMedications(data) {
    container.innerHTML = '';
    let totalMeds = 0;
    data = data.filter((category) => category.medications.length > 0);
    lastRenderedData = data;
    renderCategoryNav(data);

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        resultsCount.textContent = "0 medications found";
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    data.forEach((category, categoryIndex) => {
        if (category.medications.length === 0) return;

        const categoryStyle = getCategoryStyle(category.category);
        const catDiv = document.createElement('div');
        catDiv.id = getCategoryId(category.category);
        catDiv.dataset.categoryName = category.category;
        catDiv.className = 'category-section relative bg-white rounded-2xl shadow-card border border-slate-200/80 overflow-hidden mb-6';

        const catHeader = document.createElement('div');
        catHeader.className = 'bg-slate-50/80 border-b border-slate-200/80 pl-5 pr-5 sm:pl-6 sm:pr-6 py-4 flex justify-between items-center gap-3';
        catHeader.innerHTML = `
            <span class="absolute left-0 top-0 bottom-0 w-1 ${categoryStyle.accent}"></span>
            <h2 class="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3 min-w-0">
                <span class="flex items-center justify-center w-9 h-9 rounded-xl ${categoryStyle.iconBg} shrink-0">
                    <i data-lucide="${categoryStyle.icon}" class="w-5 h-5 ${categoryStyle.iconColor}"></i>
                </span>
                <span class="truncate">${category.category}</span>
            </h2>
            <div class="flex items-center gap-2 shrink-0">
                <span class="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">${category.medications.length} meds</span>
                <button
                    type="button"
                    data-export-category="true"
                    aria-label="Save ${category.category} as PDF"
                    title="Save this category as PDF"
                    class="pdf-export-btn inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 px-2.5 py-1 rounded-full shadow-sm transition-colors"
                >
                    <i data-lucide="file-down" class="w-3.5 h-3.5"></i>
                    PDF
                </button>
            </div>
        `;
        catDiv.appendChild(catHeader);

        if (category.category === "Infectious Disease") {
            const idNote = document.createElement('p');
            idNote.className = 'px-5 sm:px-6 py-3 text-xs text-slate-600 bg-emerald-50/60 border-b border-slate-200/80 leading-relaxed';
            idNote.innerHTML = `
                Best empiric choice depends on local resistance and the patient. Cross-check with
                <a href="https://www.bugsanddrugs.org/" target="_blank" rel="noopener noreferrer" class="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">Bugs &amp; Drugs</a>
                (Canadian; access varies by province) or your formulary. Alternatives tagged
                <span class="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded px-1">not in guide</span>
                are not on this delegated list.
            `;
            catDiv.appendChild(idNote);
        }

        const medList = document.createElement('div');
        medList.className = 'divide-y divide-slate-100';

        category.medications.forEach((med, medIndex) => {
            totalMeds++;
            const accordionId = `accordion-${categoryIndex}-${medIndex}`;
            const accordionButtonId = `accordion-btn-${categoryIndex}-${medIndex}`;
            const medItem = document.createElement('div');
            const isFavourite = favourites.includes(med.name);
            medItem.id = getMedId(med.name);
            medItem.className = 'med-card group relative';
            medItem.dataset.medName = med.name;
            
            medItem.innerHTML = `
                <button
                    type="button"
                    id="${accordionButtonId}"
                    data-accordion-trigger="true"
                    aria-expanded="false"
                    aria-controls="${accordionId}"
                    class="w-full text-left px-5 sm:px-6 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/60 hover:bg-indigo-50/40 flex justify-between items-center gap-4 transition-colors"
                >
                    <div class="min-w-0 pr-10">
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">${med.name}</h3>
                        ${
                            med.dutyImpact
                                ? `<span class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5" title="Sedating or impairs vision—see At Sea notes">
                                    <i data-lucide="triangle-alert" class="w-3 h-3"></i> Duty impact
                                </span>`
                                : ""
                        }
                        <p class="text-sm text-slate-500 mt-0.5 line-clamp-1">${med.ind}</p>
                    </div>
                    <span class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors shrink-0">
                        <i data-lucide="chevron-down" class="chevron-icon w-4 h-4 text-slate-500 group-hover:text-indigo-600 transform transition-transform duration-300"></i>
                    </span>
                </button>

                <div
                    id="${accordionId}"
                    class="accordion-content bg-slate-50/60 px-5 sm:px-6 border-t border-slate-100"
                    aria-hidden="true"
                    aria-labelledby="${accordionButtonId}"
                    inert
                >
                    <div class="py-4 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="rounded-xl border border-slate-200/80 bg-white p-4">
                                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <i data-lucide="package" class="w-3.5 h-3.5"></i> Available Dosages/Forms
                                </h4>
                                <div class="text-sm text-slate-800 leading-relaxed">${med.forms}</div>
                            </div>
                            <div class="rounded-xl border border-slate-200/80 bg-white p-4">
                                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <i data-lucide="stethoscope" class="w-3.5 h-3.5"></i> Indications
                                </h4>
                                <div class="text-sm text-slate-800 leading-relaxed">${med.ind}</div>
                            </div>
                        </div>

                        <div class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                            <h4 class="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <i data-lucide="syringe" class="w-3.5 h-3.5"></i> Dosing
                            </h4>
                            <div class="text-sm text-slate-800 font-medium leading-relaxed">${med.dose}</div>
                        </div>

                        <div class="rounded-xl border border-red-100 bg-red-50/60 p-4">
                            <h4 class="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <i data-lucide="ban" class="w-3.5 h-3.5"></i> Contraindications
                            </h4>
                            <div class="text-sm text-slate-700 leading-relaxed">${med.contra}</div>
                        </div>

                        <div class="rounded-xl border border-amber-200/70 bg-amber-50 p-4">
                            <div class="flex items-start gap-3">
                                <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 shrink-0">
                                    <i data-lucide="lightbulb" class="w-4 h-4 text-amber-600"></i>
                                </span>
                                <div class="min-w-0">
                                    <h4 class="text-sm font-bold text-amber-800">Pro Tip</h4>
                                    <div class="text-sm text-amber-900 mt-1 leading-relaxed">${med.protip}</div>
                                </div>
                            </div>
                        </div>

                        ${
                            med.details && med.details.length
                                ? `
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                                ${med.details
                                    .map(
                                        (detail) => `
                                    <div class="${
                                        detail.title === "At Sea"
                                            ? "rounded-xl border border-sky-200 bg-sky-50 p-4 lg:col-span-2"
                                            : "rounded-xl border border-slate-200/80 bg-white p-4"
                                    }">
                                        <h4 class="text-[11px] font-bold ${detail.title === "At Sea" ? "text-sky-800" : "text-slate-500"} uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            ${
                                                detail.icon
                                                    ? `<i data-lucide="${detail.icon}" class="w-3.5 h-3.5 text-indigo-500"></i>`
                                                    : ""
                                            }
                                            ${detail.title}
                                        </h4>
                                        <div class="text-sm text-slate-700 leading-relaxed">${detail.content}</div>
                                    </div>
                                `
                                    )
                                    .join("")}
                            </div>
                        `
                                : ""
                        }

                        <div class="flex flex-wrap justify-end gap-2">
                            ${
                                infusionPresetByMed[med.name]
                                    ? `<a
                                        href="infusion.html?drug=${infusionPresetByMed[med.name]}"
                                        class="copy-link-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm transition-colors"
                                    >
                                        <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                                        Infusion calculator
                                    </a>`
                                    : ""
                            }
                            <button
                                type="button"
                                data-copy-link="true"
                                class="copy-link-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm transition-colors"
                            >
                                <i data-lucide="link" class="w-3.5 h-3.5"></i>
                                <span>Copy link</span>
                            </button>
                            <button
                                type="button"
                                data-export-medication="true"
                                class="pdf-export-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm transition-colors"
                            >
                                <i data-lucide="file-down" class="w-3.5 h-3.5"></i>
                                Save as PDF
                            </button>
                            <button
                                type="button"
                                data-collapse-entry="true"
                                class="collapse-entry-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-full hover:bg-white transition-colors"
                            >
                                <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
                                Close ${med.name}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    data-favourite-toggle="true"
                    aria-pressed="${isFavourite}"
                    aria-label="${isFavourite ? 'Remove from' : 'Add to'} favourites: ${med.name}"
                    title="${isFavourite ? 'Remove from favourites' : 'Add to favourites'}"
                    class="favourite-btn absolute top-4 right-[3.75rem] sm:right-16 flex items-center justify-center w-8 h-8 rounded-full text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                >
                    <i data-lucide="star" class="w-4 h-4 ${isFavourite ? 'fill-amber-400 text-amber-500' : ''}"></i>
                </button>
            `;
            medList.appendChild(medItem);
        });

        catDiv.appendChild(medList);
        container.appendChild(catDiv);
    });

    updateResultsCount(totalMeds);
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }

    annotateWeightDoses(container);
    highlightMatches(container, currentSearchTokens);
}

// ---------- Medication links (#med-<name>) ----------
const slugify = (value) =>
    String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const medIdByName = new Map();
const medNameById = new Map();
normalizedMedData.forEach((category) =>
    category.medications.forEach((med) => {
        let id = `med-${slugify(med.name)}`;
        for (let n = 2; medNameById.has(id); n++) id = `med-${slugify(med.name)}-${n}`;
        medIdByName.set(med.name, id);
        medNameById.set(id, med.name);
    })
);
// Entries with an infusion-calculator preset (infusion.html?drug=<id>).
const infusionPresetByMed = {
    "Norepinephrine": "norepinephrine",
    "Epinephrine": "epinephrine",
    "Phenylephrine": "phenylephrine",
    "Dopamine": "dopamine",
    "Vasopressin": "vasopressin",
    "Amiodarone": "amiodarone",
    "Lidocaine (IV Antiarrhythmic)": "lidocaine",
    "Insulin Human Regular": "insulin",
    "Magnesium Sulphate": "magnesium"
};
const getMedId = (name) => medIdByName.get(name) || `med-${slugify(name)}`;

function setCardExpanded(card, expanded) {
    const cardTrigger = card.querySelector('[data-accordion-trigger="true"]');
    if (cardTrigger && (cardTrigger.getAttribute('aria-expanded') === 'true') !== expanded) {
        toggleAccordion(cardTrigger);
    }
}

function openMedFromHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!medNameById.has(id)) return;

    let card = document.getElementById(id);
    if (!card) {
        // Entry is hidden by the current search: clear it first.
        searchInput.value = '';
        applySearch('');
        card = document.getElementById(id);
    }
    if (!card) return;

    setCardExpanded(card, true);
    recordRecent(card.dataset.medName);
    requestAnimationFrame(() => card.scrollIntoView({ block: 'start' }));
}

window.addEventListener('hashchange', openMedFromHash);

// Links to entries (favourites, recents) also work when the URL
// already points at that entry.
document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#med-"]');
    if (!link) return;
    event.preventDefault();
    const hash = link.getAttribute('href');
    if (window.location.hash === hash) {
        openMedFromHash();
    } else {
        window.location.hash = hash;
    }
});

function copyMedLink(button) {
    const card = button.closest('.med-card');
    const url = `${window.location.href.split('#')[0]}#${card.id}`;
    const label = button.querySelector('span');
    const done = () => {
        if (!label) return;
        label.textContent = 'Link copied';
        setTimeout(() => { label.textContent = 'Copy link'; }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, () => window.prompt('Copy this link:', url));
    } else {
        window.prompt('Copy this link:', url);
    }
}

// ---------- Favourites & recently viewed (stored on this device only) ----------
const favouritesStorageKey = 'paDelegationRef.meds.favourites';
const recentStorageKey = 'paDelegationRef.meds.recent';
const maxRecent = 8;
const quickAccess = document.getElementById('quickAccess');

const readNameList = (key) => {
    try {
        const value = JSON.parse(window.localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value.filter((name) => medIdByName.has(name)) : [];
    } catch {
        return [];
    }
};
const writeNameList = (key, list) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {}
};
let favourites = readNameList(favouritesStorageKey);
let recentMeds = readNameList(recentStorageKey);

function recordRecent(name) {
    recentMeds = [name, ...recentMeds.filter((item) => item !== name)].slice(0, maxRecent);
    writeNameList(recentStorageKey, recentMeds);
    renderQuickAccess();
}

function toggleFavourite(name, button) {
    const isFavourite = !favourites.includes(name);
    favourites = isFavourite ? [...favourites, name] : favourites.filter((item) => item !== name);
    writeNameList(favouritesStorageKey, favourites);

    button.setAttribute('aria-pressed', String(isFavourite));
    button.setAttribute('aria-label', `${isFavourite ? 'Remove from' : 'Add to'} favourites: ${name}`);
    button.title = isFavourite ? 'Remove from favourites' : 'Add to favourites';
    const icon = button.querySelector('svg, i');
    if (icon) {
        icon.classList.toggle('fill-amber-400', isFavourite);
        icon.classList.toggle('text-amber-500', isFavourite);
    }
    renderQuickAccess();
}

function renderQuickAccess() {
    quickAccess.innerHTML = '';
    const rows = [
        { label: 'Favourites', icon: 'star', names: favourites },
        { label: 'Recently viewed', icon: 'history', names: recentMeds, clearable: true }
    ].filter((row) => row.names.length);

    rows.forEach((row) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex flex-wrap items-center gap-2';

        const heading = document.createElement('span');
        heading.className = 'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mr-1';
        heading.innerHTML = `<i data-lucide="${row.icon}" class="w-3.5 h-3.5"></i>`;
        heading.append(row.label);
        rowDiv.appendChild(heading);

        row.names.forEach((name) => {
            const chip = document.createElement('a');
            chip.href = `#${getMedId(name)}`;
            chip.className =
                'inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full px-3 py-1 transition-colors';
            chip.textContent = name;
            rowDiv.appendChild(chip);
        });

        if (row.label === 'Favourites') {
            const pocketButton = document.createElement('button');
            pocketButton.type = 'button';
            pocketButton.className =
                'inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-1';
            pocketButton.innerHTML = '<i data-lucide="wallet-cards" class="w-3.5 h-3.5"></i>';
            pocketButton.append('Pocket card');
            pocketButton.addEventListener('click', exportFavouritesPocketCard);
            rowDiv.appendChild(pocketButton);
        }

        if (row.clearable) {
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'text-xs font-semibold text-slate-400 hover:text-slate-600 px-1';
            clearButton.textContent = 'Clear';
            clearButton.addEventListener('click', () => {
                recentMeds = [];
                writeNameList(recentStorageKey, recentMeds);
                renderQuickAccess();
            });
            rowDiv.appendChild(clearButton);
        }

        quickAccess.appendChild(rowDiv);
    });

    quickAccess.classList.toggle('hidden', !rows.length || currentSearchTokens.length > 0);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// ---------- Weight-based dose helper ----------
// With a weight entered, every "N mg/kg" (also mcg, g, mL, units, mmol;
// per dose, per day, per min or per hour) in an entry gets the
// worked-out amount next to it. A "max" stated after it in the same
// clause caps per-dose/per-day amounts, and a draw-up volume is shown
// for per-dose amounts when the entry lists exactly one concentration.
const weightStorageKey = 'paDelegationRef.meds.weightKg';
const weightInput = document.getElementById('weightInput');
const weightClearBtn = document.getElementById('weightClearBtn');
const weightHint = document.getElementById('weightHint');
const weightHintDefault = weightHint.textContent.trim();
let currentWeightKg = null;
let lastRenderedData = [];

const massFactors = { mcg: 0.001, mg: 1, g: 1000 };
const perKgPattern =
    /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(mcg|mg|g|mL|units|mmol)\/kg(?:\/(dose|day|minute|min|hour|hr|h)\b)?/g;
const maxPattern =
    /\bmax(?:imum)?\b[^0-9;]{0,24}?~?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(mcg|mg|g|mL|units|mmol)\b(?!\s*\/\s*kg)(?:\s*\/\s*(day|24\s*h|dose))?/i;

const formatAmount = (value) =>
    value.toLocaleString('en-CA', {
        maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : value >= 1 ? 2 : 3
    });
const formatVolume = (value) =>
    value.toLocaleString('en-CA', { maximumFractionDigits: value >= 100 ? 0 : value >= 1 ? 1 : 2 });
const convertAmount = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;
    if (fromUnit in massFactors && toUnit in massFactors) {
        return (value * massFactors[fromUnit]) / massFactors[toUnit];
    }
    return null;
};

// A single "X unit/Y mL" concentration listed in the entry's forms.
const getSingleConcentration = (forms) => {
    const found = new Map();
    const pattern = /(\d+(?:\.\d+)?)\s*(mcg|mg|g|units|mmol)\s*\/\s*(\d+(?:\.\d+)?)?\s*mL\b/gi;
    for (const match of String(forms).matchAll(pattern)) {
        const unit = match[2].toLowerCase();
        const perMl = Number(match[1]) / Number(match[3] || 1);
        const isMass = unit in massFactors;
        const value = isMass ? perMl * massFactors[unit] : perMl;
        const kind = isMass ? 'mg' : unit;
        found.set(`${kind}:${Number(value.toPrecision(6))}`, { value, unit: kind });
    }
    return found.size === 1 ? [...found.values()][0] : null;
};
const medConcentrations = new Map(
    normalizedMedData.flatMap((category) =>
        category.medications.map((med) => [med.name, getSingleConcentration(med.forms)])
    )
);

// Text up to the end of the clause: the first ";" that isn't inside
// parentheses opened after the dose (e.g. "(min 0.1 mg; max 0.5 mg)").
const getClause = (text) => {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(') depth++;
        else if (char === ')') depth = Math.max(0, depth - 1);
        else if (char === ';' && depth === 0) return text.slice(0, i);
    }
    return text;
};
const injectableRoute = /\b(IV|IM|IO|IN|subcut)\b/;
const nonInjectableRoute = /\b(PO|PR|SL|nebuli[sz]ed|topical)\b/i;

function describeWeightDose(match, following, concentration) {
    const weight = currentWeightKg;
    const unit = match[3];
    const per = (match[4] || 'dose').toLowerCase();
    const isRate = ['min', 'minute', 'h', 'hr', 'hour'].includes(per);
    const low = Number(match[1]) * weight;
    const high = match[2] ? Number(match[2]) * weight : low;
    const suffix = isRate ? (per.startsWith('min') ? '/min' : '/h') : per === 'day' ? '/day' : '';
    const range = high !== low ? `${formatAmount(low)}–${formatAmount(high)}` : formatAmount(low);
    let text = `${formatAmount(weight)} kg → ${range} ${unit}${suffix}`;
    let volumeRange = [low, high];

    if (!isRate) {
        const max = following.match(maxPattern);
        if (max) {
            const maxPer = (max[3] || '').toLowerCase();
            const maxIsDaily = maxPer === 'day' || maxPer.startsWith('24');
            const applies = per === 'day' ? maxPer !== 'dose' : !maxIsDaily;
            const maxValue = convertAmount(Number(max[1].replace(/,/g, '')), max[2], unit);
            if (applies && maxValue !== null && high > maxValue) {
                text += `; max ${max[1]} ${max[2]}${maxIsDaily ? '/day' : ''} applies`;
                volumeRange = [Math.min(low, maxValue), maxValue];
            }
        }

        // Volume only for injectable doses: the listed concentration is
        // the injection's, not an oral liquid's.
        const routeText = following.slice(0, 40);
        const oralOnly = nonInjectableRoute.test(routeText) && !injectableRoute.test(routeText);
        if (per === 'dose' && concentration && !oralOnly) {
            const toConcentrationUnit = (value) =>
                concentration.unit === 'mg' ? convertAmount(value, unit, 'mg') : unit === concentration.unit ? value : null;
            const [volLow, volHigh] = volumeRange.map((value) => {
                const amount = toConcentrationUnit(value);
                return amount === null ? null : amount / concentration.value;
            });
            if (volLow !== null && volHigh !== null) {
                const volumes = volLow !== volHigh ? `${formatVolume(volLow)}–${formatVolume(volHigh)}` : formatVolume(volLow);
                text += ` (${volumes} mL)`;
            }
        }
    }

    return text;
}

function annotateWeightDoses(root) {
    if (!currentWeightKg) return;

    root.querySelectorAll('.med-card').forEach((card) => {
        const concentration = medConcentrations.get(card.dataset.medName) || null;
        const content = card.querySelector('.accordion-content');
        if (!content) return;

        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.includes('/kg')) nodes.push(walker.currentNode);
        }

        nodes.forEach((node) => {
            const text = node.nodeValue;
            const matches = [...text.matchAll(perKgPattern)];
            if (!matches.length) return;

            const fragment = document.createDocumentFragment();
            let cursor = 0;
            matches.forEach((match, index) => {
                const end = match.index + match[0].length;
                const following = getClause(text.slice(end));

                fragment.append(text.slice(cursor, end));
                const tag = document.createElement('span');
                tag.className =
                    'weight-dose ml-1 inline-block rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-semibold leading-snug px-1.5 py-px align-middle';
                tag.textContent = describeWeightDose(match, following, concentration);
                fragment.append(tag);
                cursor = end;
            });
            fragment.append(text.slice(cursor));
            node.replaceWith(fragment);
        });
    });
}

// Re-render in place, keeping open entries and scroll position.
function rerenderPreservingState() {
    const openNames = [...container.querySelectorAll('.accordion-content.expanded')].map(
        (content) => content.closest('.med-card').dataset.medName
    );
    const wasAllExpanded = allExpanded;
    const scrollPosition = window.scrollY;

    renderMedications(lastRenderedData);
    if (wasAllExpanded) {
        setAllExpanded(true);
    } else {
        openNames.forEach((name) => {
            const card = document.getElementById(getMedId(name));
            if (card) setCardExpanded(card, true);
        });
    }
    window.scrollTo(0, scrollPosition);
}

function setWeight(rawValue, { rerender = true } = {}) {
    const value = Number(rawValue);
    currentWeightKg = rawValue !== '' && value >= 1 && value <= 250 ? value : null;
    weightClearBtn.classList.toggle('hidden', rawValue === '');
    weightHint.textContent = currentWeightKg
        ? `Doses shown for ${formatAmount(currentWeightKg)} kg, rounded. Capped at a max stated in the same line; draw-up volume shown only where one concentration is listed.`
        : rawValue === ''
          ? weightHintDefault
          : 'Enter a weight between 1 and 250 kg.';

    try {
        if (currentWeightKg) window.sessionStorage.setItem(weightStorageKey, String(currentWeightKg));
        else window.sessionStorage.removeItem(weightStorageKey);
    } catch {}

    if (rerender) rerenderPreservingState();
}

// Kept for this browser tab only, so a weight doesn't carry over to
// another day or patient.
function restoreWeight() {
    try {
        const saved = window.sessionStorage.getItem(weightStorageKey);
        if (saved) {
            weightInput.value = saved;
            setWeight(saved, { rerender: false });
        }
    } catch {}
}

let weightInputTimer = null;
weightInput.addEventListener('input', () => {
    clearTimeout(weightInputTimer);
    weightInputTimer = setTimeout(() => setWeight(weightInput.value.trim()), 250);
});
weightClearBtn.addEventListener('click', () => {
    weightInput.value = '';
    setWeight('');
    weightInput.focus();
});

// Accordion Logic
function toggleAccordion(button) {
    const content = button.nextElementSibling;
    const icon =
        button.querySelector('.chevron-icon') ||
        button.querySelector('[data-lucide="chevron-down"]') ||
        button.querySelector('svg');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (icon) icon.style.transform = 'rotate(0deg)';
        content.style.paddingTop = '0';
        content.style.paddingBottom = '0';
        button.setAttribute('aria-expanded', 'false');
        content.setAttribute('aria-hidden', 'true');
        content.setAttribute('inert', '');
    } else {
        content.classList.add('expanded');
        if (icon) icon.style.transform = 'rotate(180deg)';
        content.style.paddingTop = '1rem';
        content.style.paddingBottom = '1rem';
        button.setAttribute('aria-expanded', 'true');
        content.setAttribute('aria-hidden', 'false');
        content.removeAttribute('inert');
    }
}

container.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-accordion-trigger="true"]');
    if (trigger) {
        toggleAccordion(trigger);
        const card = trigger.closest('.med-card');
        if (trigger.getAttribute('aria-expanded') === 'true') {
            recordRecent(card.dataset.medName);
            history.replaceState(null, '', `#${card.id}`);
        } else if (window.location.hash === `#${card.id}`) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return;
    }

    const favouriteButton = event.target.closest('[data-favourite-toggle="true"]');
    if (favouriteButton) {
        toggleFavourite(favouriteButton.closest('.med-card').dataset.medName, favouriteButton);
        return;
    }

    const copyLinkButton = event.target.closest('[data-copy-link="true"]');
    if (copyLinkButton) {
        copyMedLink(copyLinkButton);
        return;
    }

    const exportCategoryButton = event.target.closest('[data-export-category="true"]');
    if (exportCategoryButton) {
        exportToPdf('category', exportCategoryButton.closest('.category-section'));
        return;
    }

    const exportMedicationButton = event.target.closest('[data-export-medication="true"]');
    if (exportMedicationButton) {
        exportToPdf('medication', exportMedicationButton.closest('.med-card'));
        return;
    }

    // "Close" button at the bottom of a long entry: collapse it and
    // bring its header back into view so the list position isn't lost.
    const collapseButton = event.target.closest('[data-collapse-entry="true"]');
    if (collapseButton) {
        const card = collapseButton.closest('.med-card');
        const cardTrigger = card && card.querySelector('[data-accordion-trigger="true"]');
        if (!cardTrigger) return;
        toggleAccordion(cardTrigger);
        card.scrollIntoView({ block: 'start' });
        cardTrigger.focus({ preventScroll: true });
    }
});

// PDF export uses the browser's print dialog ("Save as PDF").
// scope: "view" (everything currently shown), "category", or "medication".
// The document title doubles as the suggested PDF file name.
let printScopeActive = false;

function clearPrintScope() {
    document.body.removeAttribute('data-print-scope');
    document.body.removeAttribute('data-print-mode');
    pocketCard.innerHTML = '';
    document.querySelectorAll('.print-target').forEach((el) => el.classList.remove('print-target'));
    document.title = originalDocumentTitle;
    printScopeActive = false;
}

function setPrintHeader(title) {
    printTitle.textContent = title;
    const parts = [`Saved ${new Date().toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}`];
    if (currentSearchTerm) parts.push(`Search: "${currentSearchTerm}"`);
    if (currentWeightKg) parts.push(`Weight-based doses shown for ${formatAmount(currentWeightKg)} kg`);
    printMeta.textContent = parts.join(' · ');
}

function exportToPdf(scope, target) {
    clearPrintScope();
    let title = 'Medication Reference';

    if (scope === 'category' && target) {
        target.classList.add('print-target');
        title = `${target.dataset.categoryName} — Medication Reference`;
    } else if (scope === 'medication' && target) {
        const category = target.closest('.category-section');
        target.classList.add('print-target');
        if (category) category.classList.add('print-target');
        title = `${target.dataset.medName} — Medication Reference`;
    } else if (currentSearchTerm) {
        title = `Medication Reference — ${currentSearchTerm}`;
    }

    if (scope !== 'view') document.body.setAttribute('data-print-scope', scope);
    setPrintHeader(title);
    document.title = title;
    printScopeActive = true;
    window.print();
}

// Ctrl/Cmd+P without a button still gets a header for the current view.
window.addEventListener('beforeprint', () => {
    if (!printScopeActive) {
        setPrintHeader(
            currentSearchTerm ? `Medication Reference — ${currentSearchTerm}` : 'Medication Reference'
        );
    }
});
window.addEventListener('afterprint', clearPrintScope);

exportViewBtn.addEventListener('click', () => exportToPdf('view'));

// Pocket card: dosing-only, multi-column PDF of the given categories
// (current view, or favourites), for printing/laminating.
function exportPocketCard(categories, scopeLabel) {
    clearPrintScope();
    const saved = new Date().toLocaleDateString('en-CA', { dateStyle: 'medium' });

    const header = document.createElement('div');
    header.className = 'mb-2';
    const title = document.createElement('p');
    title.className = 'font-bold text-[10pt]';
    title.textContent = `Pocket dosing card — ${scopeLabel}`;
    const meta = document.createElement('p');
    meta.className = 'text-[7pt] text-slate-500';
    meta.textContent = `Saved ${saved}. Dosing only—see the full entry for contraindications, monitoring and cautions. Personal reference; verify against current guidelines and your delegation agreement.`;
    header.append(title, meta);

    const columns = document.createElement('div');
    columns.className = 'pocket-columns';
    categories.forEach((category) => {
        if (!category.medications.length) return;
        const heading = document.createElement('p');
        heading.className = 'pocket-category';
        heading.textContent = category.category;
        columns.appendChild(heading);

        category.medications.forEach((med) => {
            const entry = document.createElement('div');
            entry.className = 'pocket-entry';
            const name = document.createElement('p');
            name.className = 'font-bold';
            name.textContent = med.name;
            const forms = document.createElement('p');
            forms.className = 'text-slate-500';
            forms.textContent = med.forms;
            const dose = document.createElement('div');
            dose.innerHTML = med.dose;
            entry.append(name, forms, dose);
            columns.appendChild(entry);
        });
    });

    pocketCard.replaceChildren(header, columns);
    document.body.setAttribute('data-print-mode', 'pocket');
    document.title = `Pocket card — ${scopeLabel}`;
    printScopeActive = true;
    window.print();
}

pocketCardBtn.addEventListener('click', () =>
    exportPocketCard(lastRenderedData, currentSearchTerm ? `"${currentSearchTerm}"` : 'All medications')
);

function exportFavouritesPocketCard() {
    const categories = normalizedMedData
        .map((category) => ({
            ...category,
            medications: category.medications.filter((med) => favourites.includes(med.name))
        }))
        .filter((category) => category.medications.length);
    exportPocketCard(categories, 'Favourites');
}

emptyClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0 });
});

window.addEventListener(
    'scroll',
    () => {
        const show = window.scrollY > 600;
        backToTopBtn.classList.toggle('hidden', !show);
        backToTopBtn.classList.toggle('inline-flex', show);
    },
    { passive: true }
);

// Expand/Collapse All
expandAllBtn.addEventListener('click', () => {
    setAllExpanded(!allExpanded);
});

// Search Filter Logic
searchInput.addEventListener('input', (e) => {
    applySearch(e.target.value);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
});

searchInput.addEventListener('focus', () => {
    if (currentSearchTokens.length && visibleSuggestions.length) {
        renderSuggestions();
    }
});

searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (searchInput.value.trim()) {
            searchInput.value = '';
            applySearch('');
        }
        setSuggestionsVisibility(false);
        return;
    }

    if (!visibleSuggestions.length || searchSuggestions.classList.contains('hidden')) {
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % visibleSuggestions.length;
        renderSuggestions();
        scrollActiveSuggestionIntoView();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestionIndex =
            (activeSuggestionIndex - 1 + visibleSuggestions.length) % visibleSuggestions.length;
        renderSuggestions();
        scrollActiveSuggestionIntoView();
    } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        const selectedSuggestion = visibleSuggestions[activeSuggestionIndex];
        searchInput.value = selectedSuggestion.searchValue;
        applySearch(selectedSuggestion.searchValue);
        setSuggestionsVisibility(false);
    }
});

searchInput.addEventListener('blur', () => {
    setTimeout(() => setSuggestionsVisibility(false), suggestionBlurDelay);
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('#searchWrapper')) {
        setSuggestionsVisibility(false);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    const tagName = target && target.tagName ? target.tagName.toUpperCase() : '';
    const isEditable =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        (target && target.isContentEditable);

    if (isEditable) return;

    event.preventDefault();
    searchInput.focus();
});

// Initial Render
restoreWeight();
applySearch('');
openMedFromHash();
// Styles load after this script, which shifts the layout; re-align a
// deep-linked entry once everything has loaded.
window.addEventListener('load', () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const card = id.startsWith('med-') ? document.getElementById(id) : null;
    if (card) card.scrollIntoView({ block: 'start' });
});

// Lucide is loaded with `defer`, so it isn't available while this
// inline script runs; convert the initially rendered icons once the
// deferred scripts have executed.
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
});
