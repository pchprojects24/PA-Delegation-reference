// At-sea / operational notes, merged into matching medications as an
// "At Sea" section. `duty: true` adds a "Duty impact" badge for meds that
// sedate or impair vision/coordination (watchkeeping, ladders, flight deck,
// small boats). Keys must match medication names exactly.
const dutyNote =
    "Duty impact: sedation/impairment—consider temporary restriction from watchkeeping, lookout, helm, flight deck, small-boat, diving and firefighting duties; inform the chain of command of the restriction (not the diagnosis).";
const atSeaNotes = {
    "Dimenhydrinate (Gravol)": { duty: true, notes: [
        dutyNote,
        "Seasickness: most effective taken 30–60 min before expected motion (e.g., before leaving harbour or heavy weather), not after vomiting is established.",
        "Non-drug measures help: work on the upper deck or amidships, eyes on the horizon, fresh air, small frequent meals and fluids.",
        "Anticholinergic—impairs sweating; caution in hot machinery spaces and during firefighting."
    ]},
    "Diphenhydramine (Benadryl)": { duty: true, notes: [
        dutyNote,
        "For itch/allergy in watchkeepers, prefer a non-sedating option (loratadine) when appropriate.",
        "Anticholinergic—impairs sweating; caution in hot spaces."
    ]},
    "Hydroxyzine": { duty: true, notes: [
        dutyNote,
        "QT prolongation: avoid stacking with ondansetron, haloperidol, citalopram or quetiapine, especially after vomiting/low potassium."
    ]},
    "Cetirizine (Reactine) / Loratadine (Claritin)": { notes: [
        "Preferred antihistamines for watchkeepers; loratadine is the least sedating—cetirizine sedates some people, so trial off-watch first."
    ]},
    "Zopiclone": { duty: true, notes: [
        dutyNote,
        "Watch-rotation insomnia: only when 7–8 h of uninterrupted sleep is available before the next watch; next-day impairment and slowed response to alarms/emergency stations are possible.",
        "Sleep hygiene first: dark, quiet rack, consistent pre-sleep routine, limit caffeine in the last 6 h before sleep."
    ]},
    "Quetiapine": { duty: true, notes: [dutyNote, "Orthostatic hypotension—extra fall risk on ladders and in a seaway."] },
    "Cyclobenzaprine (Flexeril)": { duty: true, notes: [dutyNote, "Strains from ladders, lifting and heavy weather are common; plan modified duties rather than relying on a sedating relaxant."] },
    "Haloperidol (Haldol)": { duty: true, notes: [
        dutyNote,
        "Acute agitation at sea: ensure staff safety in confined spaces, use a secure/quiet space, and involve the command early; plan medevac or ongoing management with the shore physician."
    ]},
    "Benztropine": { duty: true, notes: [dutyNote, "Anticholinergic—blurred vision and impaired sweating (heat risk)."] },
    "Citalopram": { notes: [
        "Mental health at sea: isolation, fatigue and limited follow-up raise risk—screen for suicidal ideation, agree a safety plan, and arrange shore mental health follow-up (and medevac if unsafe).",
        "Do not start or stop without a follow-up plan that survives the deployment (supply, monitoring, discontinuation symptoms)."
    ]},
    "Morphine Sulphate": { duty: true, notes: [
        dutyNote,
        "Controlled drug register: witnessed administration and wastage, running balance, reconcile at every handover.",
        "Keep naloxone and airway kit at hand; you may be the only provider available to manage respiratory depression."
    ]},
    "Fentanyl": { duty: true, notes: [
        dutyNote,
        "Controlled drug register: witnessed administration and wastage, running balance, reconcile at every handover.",
        "Useful for rapid analgesia during casualty extraction from confined compartments; keep naloxone and airway kit at hand."
    ]},
    "Ketamine": { duty: true, notes: [
        dutyNote,
        "Good austere/field analgesic—preserves airway reflexes and blood pressure; useful for casualty extraction and fracture splinting with limited monitoring.",
        "Controlled drug register rules apply."
    ]},
    "Acetaminophen with Codeine Tablets": { duty: true, notes: [dutyNote, "Controlled drug register rules apply; count tablets dispensed and returned."] },
    "Diazepam (Valium)": { duty: true, notes: [
        dutyNote,
        "Alcohol withdrawal after sailing: heavy drinkers ashore can withdraw 1–3 days after departure (tremor, sweating, agitation, seizures)—ask about intake at pre-sail and after port visits; give thiamine.",
        "Controlled drug register rules apply."
    ]},
    "Midazolam (Versed)": { duty: true, notes: [dutyNote, "Seizure without IV access (rolling ship, difficult access): IM/intranasal route is practical.", "Controlled drug register rules apply."] },
    "Lorazepam (Ativan)": { duty: true, notes: [dutyNote, "Consider for alcohol withdrawal after sailing when hepatic impairment is suspected (physician-directed).", "Controlled drug register rules apply."] },
    "Methoxyflurane 99.9% Inhalation with Device": { duty: true, notes: [
        dutyNote,
        "Good option for casualties in machinery spaces, ladders or confined compartments where IV access is difficult.",
        "Use in a ventilated space; minimize repeated exposure of the same caregivers in small, closed compartments."
    ]},
    "Cyclopentolate (1%)": { duty: true, notes: [dutyNote, "Blurred vision and photophobia for up to 24 h—no watchkeeping, ladders in poor light or upper-deck work until resolved."] },
    "Tropicamide (1%)": { duty: true, notes: [dutyNote, "Blurred vision and photophobia for 4–6 h—plan the exam around watch timing."] },
    "Ondansetron 2 mg/mL Injection (2 mL)": { notes: [
        "Not a good seasickness drug—antihistamines (dimenhydrinate) work better for motion sickness.",
        "Prolonged vomiting at sea lowers potassium/magnesium—QT risk; avoid stacking QT-prolonging drugs."
    ]},
    "Metoclopramide (Maxeran)": { notes: ["Not effective for motion sickness; watch for akathisia/dystonia (benztropine or diphenhydramine on hand)."] },
    "Loperamide (Imodium)": { notes: [
        "Travellers' diarrhea after port visits: oral rehydration first; avoid loperamide with fever or bloody stool.",
        "Two or more crew with vomiting/diarrhea = possible outbreak (norovirus/food-borne): isolate, exclude galley and food handlers until 48 h symptom-free, enhance cleaning, and notify the command and preventive medicine."
    ]},
    "Azithromycin": { notes: [
        "Commonly used for travellers' diarrhea acquired ashore, especially in South/Southeast Asia where fluoroquinolone resistance is common—regimen per CATMAT/physician."
    ]},
    "Ciprofloxacin": { notes: [
        "Tendon rupture risk—consider duties involving ladders, heavy lifting and boarding parties.",
        "Photosensitivity on the upper deck; fluoroquinolone resistance is common in travellers' diarrhea from South/Southeast Asia."
    ]},
    "Doxycycline": { notes: [
        "Photosensitivity: sunscreen, cover-up and hat for upper-deck and flight-deck work.",
        "Take upright with a full glass of water—harder in heavy weather; avoid taking right before lying down in the rack.",
        "If used for malaria chemoprophylaxis on deployment, follow the current Force Health Protection direction for the area."
    ]},
    "Septra (TMP-SMX)": { notes: ["Photosensitivity: sun protection for upper-deck work."] },
    "Ceftriaxone": { notes: [
        "STIs after port visits: test and treat, advise abstinence until treated, and arrange partner notification/public health reporting at the next port or on return."
    ]},
    "Truvada": { notes: [
        "Post-exposure after a port visit (sexual or needle-stick): start as early as possible (within 72 h) with physician direction—do not wait for baseline labs at sea.",
        "Draw or arrange baseline and follow-up HIV/hepatitis B/renal testing at the next port or on return; confirm enough stock for the full 28 days."
    ]},
    "Levonorgestrel 1.5 mg (Emergency Contraception)": { notes: ["Port visits: offer discreetly and promptly—effectiveness falls with time."] },
    "Desogestrel–Ethinyl Estradiol (21-day pack)": { notes: ["Crossing time zones: keep taking at roughly the same interval (not the same clock time) so no dose is more than 24 h late; ensure supply covers the deployment."] },
    "Levonorgestrel–Ethinyl Estradiol (COC)": { notes: ["Crossing time zones: keep the dosing interval about 24 h; ensure supply covers the deployment."] },
    "Triquilar (Triphasic COC, 21-day pack)": { notes: ["Crossing time zones: keep the dosing interval about 24 h; ensure enough packs for the deployment."] },
    "Insulin Human Regular": { notes: [
        "Cold chain: store unopened vials at 2–8°C, never frozen; log fridge temperatures daily. In-use vial room-temperature limits per product monograph.",
        "Crew with insulin-treated diabetes: plan meals around watches and ensure glucose testing supplies and hypoglycemia rescue are available."
    ]},
    "Tetanus Vaccine (Td or Tdap)": { notes: [
        "Cold chain: 2–8°C, never frozen; discard if frozen or after a temperature excursion (consult).",
        "Wire, rope and machinery wounds are often dirty—check immunization status at every wound visit."
    ]},
    "Epinephrine": { notes: ["Heat and light degrade epinephrine—store crash-bag stock away from heat, inspect for discolouration, rotate often."] },
    "Nitroglycerin spray": { notes: ["Ask specifically about PDE5 inhibitor use (sildenafil/tadalafil), including after port visits, before giving nitrates."] },
    "Tenecteplase": { notes: ["Without PCI access at sea, fibrinolysis may be the only reperfusion option—decide early with the shore physician and start medevac planning at the same time."] },
    "Salbutamol (Albuterol/Ventolin)": { notes: ["Smoke inhalation after shipboard fires: treat bronchospasm, give high-flow oxygen, and think about carbon monoxide and cyanide."] },
    "Cyanokit (Hydroxocobalamin)": { notes: [
        "Shipboard fire casualties with altered consciousness, hypotension, seizures or high lactate: consider cyanide (plastics/insulation combustion) and give early; give high-flow oxygen for carbon monoxide.",
        "Know where the kit is stored and practise preparing it—time matters."
    ]},
    "Sodium Thiosulfate": { notes: ["Shipboard fire casualties: adjunct to hydroxocobalamin for suspected cyanide toxicity (physician/toxicology)."] },
    "Silver Sulfadiazine 1% Cream": { notes: ["Burns from fires and steam leaks in machinery spaces: cool with water, estimate TBSA, start fluids, and request medevac early for major, facial, circumferential or airway burns."] },
    "Lactated Ringer’s": { notes: ["Man overboard/cold-water immersion: give warmed fluids if possible; handle hypothermic casualties gently and horizontally.", "Bulk and finite stock—track use and resupply at RAS/port."] },
    "NaCl 0.9% (Normal Saline)": { notes: ["Warm fluids for hypothermic casualties if possible; bulk and finite stock—track use and resupply."] },
    "Thiamine (B1)": { notes: ["Heavy drinking ashore is common around port visits—give thiamine to anyone treated for alcohol withdrawal or malnutrition."] },
    "Ibuprofen (Advil/Motrin)": { notes: ["Heat stress and dehydration (engine rooms, firefighting) increase kidney injury risk—rehydrate first and use the shortest course."] },
    "Naproxen (Aleve)": { notes: ["Heat stress and dehydration increase kidney injury risk—rehydrate first."] },
    "Ketorolac (Toradol)": { notes: ["Avoid in dehydrated or heat-stressed crew (kidney injury risk); rehydrate first."] },
    "Pseudoephedrine HCl": { notes: [
        "Divers and aircrew: congestion means barotrauma risk—no diving or flying until resolved; decongestants can mask the problem.",
        "Stimulant—can disturb sleep between watches."
    ]},
    "Oxymetazoline 0.05% Nasal Spray": { notes: ["Divers and aircrew: no diving or flying while congested; do not use a decongestant to 'get through' a dive or flight."] },
    "Dristan / Otrivin (Xylometazoline)": { notes: ["Divers and aircrew: no diving or flying while congested."] },
    "Ciprodex": { notes: ["Otitis externa is common in divers and hot, humid ships: keep the ear dry; no diving until resolved."] },
    "Tetracaine (Topical/Ophthalmic)": { notes: ["Grinding, chipping and wire-brushing cause foreign-body injuries—check for penetrating injury; never dispense tetracaine for use on the mess deck."] },
    "Fluorescein": { notes: ["Foreign-body/abrasion injuries from grinding or wind-blown debris: evert the lids and check for penetrating injury (Seidel test)."] },
    "Tobramycin 3mg/g Ophthalmic Ointment": { notes: ["Contact lens wearers with red eye: stop lens wear and cover Pseudomonas; hot, dusty ship environments increase risk."] },
    "Clotrimazole": { notes: ["Hot, humid berthing and shared showers: tinea is common—dry feet thoroughly, wear shower sandals, change socks after watches."] },
    "Permethrin 5% Cream 30 g": { notes: ["Close-quarters berthing: treat symptomatic crew and close contacts (berth mates) at the same time; hot-wash bedding and clothing."] },
    "Permethrin 1% Cream Rinse": { notes: ["Check berth mates and close contacts; hot-wash bedding and hats."] },
    "Mupirocin": { notes: ["MRSA/skin infections spread in shared berthing: cover wounds, no sharing towels or razors, clean gym equipment."] },
    "Oracort (Triamcinolone paste)": { notes: ["No dentist onboard—arrange dental assessment at the next port for persistent lesions."] },
    "Zilactin-B": { notes: ["No dentist onboard—arrange dental assessment at the next port if pain persists."] },
    "Nicotine transdermal patch (24-hour)": { notes: ["Restricted smoking onboard and long deployments are a good opportunity to quit—offer support and enough stock for the deployment."] },
    "Nicotine gum": { notes: ["Handy for cravings during watches or in no-smoking periods; ensure enough stock."] }
};
