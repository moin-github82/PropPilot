'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { NavBar } from '../../components/NavBar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckItem { id: string; text: string; tip?: string }
interface Section    { id: string; title: string; icon: string; tag?: string; items: CheckItem[] }
interface Checklist  { id: string; label: string; emoji: string; sections: Section[] }

interface ScoreCategory { id: string; label: string; weight: number; description: string }

// ─── Checklist data ───────────────────────────────────────────────────────────

const STANDARD: Checklist = {
  id: 'standard', label: 'Full Checklist', emoji: '🧾',
  sections: [
    {
      id: 'legal-title', title: 'Legal & Title', icon: '⚖️', tag: 'Mandatory',
      items: [
        { id: 'title-register',    text: 'Title Register & Title Plan (Land Registry)',           tip: 'Order from HMLR for £3. Confirms ownership, boundaries and any charges.' },
        { id: 'covenants',         text: 'Covenants, easements & restrictions checked',            tip: 'Can restrict extensions, parking, business use. Solicitor must review.' },
        { id: 'planning-perms',    text: 'Planning permissions & enforcement notices reviewed',     tip: 'Check for expired consents or active enforcement — both can block completion.' },
        { id: 'lease-length',      text: 'Lease length confirmed — avoid < 90 years',              tip: 'Below 80 years becomes very expensive to extend and can make it unmortgageable.' },
        { id: 'ground-rent',       text: 'Ground rent terms checked — no doubling clauses',        tip: 'Doubling clauses can make a property unsellable. Aim for peppercorn or fixed.' },
        { id: 'service-charges',   text: 'Service charges & sinking fund balance reviewed',        tip: 'Ask for last 3 years\' accounts. A low sinking fund means unexpected bills.' },
        { id: 's20-notices',       text: 'Section 20 notices checked for planned major works',     tip: 'You could inherit liability for works consulted before you owned the property.' },
        { id: 'la-searches',       text: 'Local Authority searches completed',                     tip: 'Reveals planning decisions, road schemes, enforcement notices and more.' },
      ],
    },
    {
      id: 'structural', title: 'Structural & Condition', icon: '🏗️', tag: 'Mandatory',
      items: [
        { id: 'rics-survey',     text: 'RICS HomeBuyer or Full Structural survey instructed',     tip: 'Never skip this. A £500 survey can save you tens of thousands.' },
        { id: 'damp',            text: 'Damp, mould & condensation inspected',                    tip: 'Check under carpets, behind furniture and in corner walls.' },
        { id: 'roof',            text: 'Roof condition assessed (age, tiles, flashing)',           tip: 'A new roof can cost £8–20k. Ask age and when last inspected.' },
        { id: 'plumbing',        text: 'Plumbing & water pressure tested',                        tip: 'Run taps, flush toilets and check under sinks during viewing.' },
        { id: 'electrics',       text: 'Electrical wiring & consumer unit age checked',           tip: 'Rewiring can cost £3–8k. Old rubber or cloth wiring is a red flag.' },
        { id: 'boiler',          text: 'Boiler age & service history confirmed',                   tip: 'Boilers over 10 years old may need replacing soon (£2–4k).' },
        { id: 'windows',         text: 'Windows, insulation & draught-proofing inspected',        tip: 'Single glazing hugely impacts energy bills and EPC rating.' },
        { id: 'subsidence',      text: 'Subsidence indicators checked (cracks, door frames)',      tip: 'Diagonal cracks near windows/doors and sticking doors are warning signs.' },
        { id: 'asbestos',        text: 'Asbestos risk assessed (pre-2000 properties)',             tip: 'Asbestos was banned in 1999. Check artex ceilings, floor tiles, pipe lagging.' },
        { id: 'drainage',        text: 'Drainage & gutters inspected',                            tip: 'Blocked gutters cause damp. Check during rain if possible.' },
      ],
    },
    {
      id: 'financial', title: 'Financial & Mortgage', icon: '💰', tag: 'Mandatory',
      items: [
        { id: 'aip',             text: 'Mortgage in Principle (AIP) obtained',                    tip: 'Makes you a serious buyer. Lenders check credit — use soft searches first.' },
        { id: 'affordability',   text: 'Affordability stress-tested at higher interest rates',    tip: 'What if rates rise to 7%? Run the numbers before you commit.' },
        { id: 'stamp-duty',      text: 'Stamp duty calculated (inc. any surcharges)',              tip: 'First-time buyer relief applies up to £500k. 3% surcharge for second homes.' },
        { id: 'council-tax',     text: 'Council tax band verified via VOA',                       tip: 'Can add £1,200–£4,000+/yr. Check neighbours\' bands — yours may be wrong.' },
        { id: 'insurance',       text: 'Buildings insurance cost estimated (inc. flood risk)',    tip: 'Get quotes before exchange — flood risk can make insurance unaffordable.' },
      ],
    },
    {
      id: 'safety', title: 'Safety & Compliance', icon: '🛡️', tag: 'Mandatory',
      items: [
        { id: 'epc',             text: 'EPC rating reviewed (target Band C by 2030)',             tip: 'Lenders are factoring EPC into mortgage offers. Band E or below needs action.' },
        { id: 'gas-safety',      text: 'Gas safety certificate & boiler service record requested', tip: 'Landlords must provide annually. Good sellers should have records.' },
        { id: 'eicr',            text: 'EICR (Electrical Installation Condition Report) obtained', tip: 'Mandatory for rentals. Highly recommended for any purchase — costs ~£200.' },
        { id: 'fire-safety',     text: 'Fire safety checked: cladding, fire doors, EWS1 (flats)', tip: 'EWS1 form required for flats in buildings over 11m. Without it, unmortgageable.' },
        { id: 'knotweed',        text: 'Japanese knotweed survey if vegetation present',           tip: 'Knotweed can damage foundations and is very expensive to treat (£5–20k+).' },
      ],
    },
    {
      id: 'location', title: 'Location & Environmental', icon: '🌍', tag: 'Mandatory',
      items: [
        { id: 'flood-risk',      text: 'Flood risk report reviewed (Environment Agency)',         tip: 'Check gov.uk/check-flood-risk. Zone 2/3 affects insurance and value.' },
        { id: 'mining',          text: 'Mining & subsidence checks completed (region-specific)',   tip: 'Essential in Cornwall, South Wales, Yorkshire coalfields, Derbyshire, Nottinghamshire.' },
        { id: 'noise-air',       text: 'Noise & air quality assessed at different times of day',  tip: 'Visit weekday rush hour, weekend evening. Check road, rail, flight paths.' },
        { id: 'contaminated',    text: 'Contaminated land search carried out',                    tip: 'Old industrial sites, petrol stations, dry cleaners — always search.' },
      ],
    },
    {
      id: 'flats', title: 'Flats Only', icon: '🏢', tag: 'If applicable',
      items: [
        { id: 'sinking-fund',    text: 'Sinking fund balance confirmed',                          tip: 'Low balance means you\'ll fund the next major works. Ask for last 3 years.' },
        { id: 'major-works',     text: 'Planned major works schedule reviewed',                   tip: 'Roof, lift, windows — you could be billed for works already in planning.' },
        { id: 'bldg-insurance',  text: 'Building insurance policy reviewed',                      tip: 'Check it covers rebuild value, not market value. Get a copy from the freeholder.' },
        { id: 'lift',            text: 'Lift maintenance records checked (if applicable)',         tip: 'Annual service records should be available. Lift failures = major disruption.' },
        { id: 'communal',        text: 'Communal areas inspected',                                tip: 'Condition reflects management quality. Dirty, run-down = poorly managed block.' },
      ],
    },
    {
      id: 'neighbourhood', title: 'Neighbourhood & Lifestyle', icon: '🏘️', tag: 'Nice to have',
      items: [
        { id: 'visit-times',     text: 'Visited at different times of day and week',              tip: 'Quiet at 2pm on Tuesday. Very different at 11pm on Saturday.' },
        { id: 'parking',         text: 'Parking availability confirmed (on-street, permit zones)', tip: 'Check if permit zone — costs £100–400/yr per car.' },
        { id: 'noise-check',     text: 'Noise levels assessed (roads, railways, neighbours)',      tip: 'Ask the vendor directly. They have a legal duty to disclose known issues.' },
        { id: 'crime-check',     text: 'Crime rates checked (police.uk)',                          tip: 'Check by postcode on police.uk. Useful for insurance costs too.' },
        { id: 'neighbours',      text: 'Spoken to at least one neighbour',                        tip: 'Gold standard intel. Ask if there have been any disputes or issues.' },
        { id: 'future-dev',      text: 'Local development plans reviewed (council website)',       tip: 'Planning applications nearby could change views, traffic, light.' },
      ],
    },
    {
      id: 'connectivity', title: 'Connectivity & Utilities', icon: '📡', tag: 'Nice to have',
      items: [
        { id: 'broadband',       text: 'Broadband speed checked — FTTP preferred',                tip: 'Use Ofcom checker. Full-fibre (FTTP) is future-proof. ADSL < 30Mbps is poor.' },
        { id: 'mobile',          text: 'Mobile coverage confirmed (all networks)',                 tip: 'Ofcom mobile checker. Thick stone/brick walls can kill signal inside.' },
        { id: 'water-pressure',  text: 'Water pressure tested at multiple outlets',               tip: 'Low pressure = plumbing issues or shared supply. Run shower + tap together.' },
        { id: 'heating-eff',     text: 'Heating efficiency assessed (thermostat, zoning)',         tip: 'Smart controls add ~£200 but can cut bills by 10–15%.' },
      ],
    },
    {
      id: 'renovation', title: 'Renovation Potential', icon: '🔨', tag: 'Nice to have',
      items: [
        { id: 'conservation',    text: 'Conservation area & listed building status checked',       tip: 'Can restrict extensions, windows, even paint colours. Check with the council.' },
        { id: 'extension',       text: 'Loft/extension feasibility assessed',                     tip: 'Check permitted development rights and whether neighbours have extended.' },
        { id: 'planning-hist',   text: 'Neighbouring planning history reviewed',                   tip: 'Shows what\'s been approved nearby — your future outlook may change.' },
      ],
    },
    {
      id: 'negotiation', title: 'Negotiation & Value', icon: '🤝', tag: 'Nice to have',
      items: [
        { id: 'sold-prices',     text: 'Recent sold prices on same street checked (Land Registry)', tip: 'Use Rightmove sold prices or Zoopla. Adjust for condition and size.' },
        { id: 'price-trends',    text: 'Area price trends reviewed (3–5 year view)',               tip: 'Is the area gentrifying or declining? Check average prices per sq ft.' },
        { id: 'time-on-market',  text: 'Time on market checked',                                   tip: '> 3 months = something is wrong. Ask why. Leverage it in negotiation.' },
        { id: 'reason-for-sale', text: 'Reason for sale established',                             tip: 'Divorce/probate = motivated seller. Chain-free = faster completion.' },
        { id: 'fall-throughs',   text: 'Previous sale fall-through reasons established',           tip: 'Essential question. Was it survey issues? Finance? Or something worse?' },
      ],
    },
    {
      id: 'transport', title: 'Transport & Amenities', icon: '🚂', tag: 'Nice to have',
      items: [
        { id: 'commute',         text: 'Commute timed during peak hours',                          tip: 'Google Maps in incognito shows peak-time estimates. Do the actual journey.' },
        { id: 'schools',         text: 'School catchment areas confirmed',                         tip: 'Check Ofsted ratings and catchment maps — affects resale even without kids.' },
        { id: 'amenities',       text: 'Proximity to GP, shops, parks confirmed',                  tip: 'Walking distance matters more than you think when the car is unavailable.' },
        { id: 'future-transport',text: 'Future transport infrastructure plans checked',             tip: 'HS2, Crossrail, tram extensions — can transform property values.' },
      ],
    },
    {
      id: 'quality-of-life', title: 'Quality of Life', icon: '☀️', tag: 'Nice to have',
      items: [
        { id: 'sunlight',        text: 'Sunlight direction assessed (compass app)',                tip: 'South-facing garden or rear extension is a significant lifestyle upgrade.' },
        { id: 'garden-drain',    text: 'Garden drainage & condition checked',                      tip: 'Waterlogged gardens are expensive to fix. Check after rain.' },
        { id: 'room-measures',   text: 'Room measurements taken & furniture plans made',           tip: 'Floorplans often use max dimensions. Bring a tape measure.' },
        { id: 'bins',            text: 'Bin storage & collection confirmed',                       tip: 'Councils differ on collections. Check if there\'s space to store bins.' },
      ],
    },
  ],
}

const FTB: Checklist = {
  id: 'ftb', label: 'First-Time Buyer', emoji: '🏡',
  sections: [
    {
      id: 'financial-readiness', title: 'Financial Readiness', icon: '💳', tag: undefined,
      items: [
        { id: 'ftb-aip',           text: 'Mortgage in Principle (AIP) obtained',                  tip: 'Do this before viewing. It sets your budget and shows sellers you\'re serious.' },
        { id: 'ftb-deposit',       text: 'Deposit confirmed and in accessible account',            tip: 'Minimum 5% for Help to Buy, 10% for better rates. More = lower monthly payments.' },
        { id: 'ftb-affordability', text: 'Monthly repayments stress-tested at higher rates',       tip: 'Calculate at 7–8% interest. Can you still afford it? Have a buffer.' },
        { id: 'ftb-sdlt',          text: 'Stamp duty costs understood and budgeted',               tip: 'First-time buyers pay 0% on first £425k, 5% on £425k–£625k. Use our calculator.' },
        { id: 'ftb-mortgage-type', text: 'Fixed vs variable mortgage options compared',            tip: 'Fixed = certainty. Variable = lower initial rate but uncertainty. Most FTBs choose 2–5yr fixed.' },
      ],
    },
    {
      id: 'ftb-condition', title: 'Property Condition', icon: '🔍', tag: undefined,
      items: [
        { id: 'ftb-survey',    text: 'RICS HomeBuyer survey instructed',                          tip: 'Don\'t rely on the mortgage valuation — it\'s for the lender, not you. Budget £400–600.' },
        { id: 'ftb-damp',      text: 'Damp, mould & leaks checked',                              tip: 'Look in corners, under windows, behind furniture. Musty smell = alarm bell.' },
        { id: 'ftb-boiler',    text: 'Boiler age & service history confirmed',                    tip: 'Ask how old it is. A new boiler is £2–4k. Use it in negotiation.' },
        { id: 'ftb-eicr',      text: 'EICR (electrical safety) requested or planned',             tip: 'Not legally required for purchases but strongly recommended. ~£200.' },
        { id: 'ftb-roof',      text: 'Roof condition assessed',                                   tip: 'New roof = £8–20k. Ask the surveyor to specifically comment on the roof.' },
        { id: 'ftb-windows',   text: 'Window condition & insulation checked',                     tip: 'Single glazing costs £6–12k to replace and drags the EPC rating down.' },
      ],
    },
    {
      id: 'ftb-legal', title: 'Legal Essentials', icon: '📜', tag: undefined,
      items: [
        { id: 'ftb-title',      text: 'Title Register & Plan reviewed with solicitor',             tip: 'Your solicitor does this. Make sure they explain anything unusual.' },
        { id: 'ftb-covenants',  text: 'Covenants & restrictions understood',                      tip: 'Some stop you parking a van, running a business, keeping pets.' },
        { id: 'ftb-lease',      text: 'Lease length confirmed (if leasehold)',                    tip: 'Under 80 years = expensive to extend. Under 70 years = very difficult to mortgage.' },
        { id: 'ftb-grent',      text: 'Ground rent & service charges understood (if leasehold)',  tip: 'Ask for last 3 years\' service charge accounts. Check for any special levies.' },
        { id: 'ftb-searches',   text: 'Local Authority searches & drainage searches completed',    tip: 'Your solicitor orders these. Takes 2–6 weeks. Never skip them.' },
      ],
    },
    {
      id: 'ftb-safety', title: 'Safety', icon: '🛡️', tag: undefined,
      items: [
        { id: 'ftb-epc',      text: 'EPC rating reviewed — upgrading Band E or below is urgent',  tip: 'Band C is the 2030 target. Use our EPC planner to estimate upgrade costs.' },
        { id: 'ftb-fire',     text: 'Fire safety checked (especially flats)',                     tip: 'Flats: check for sprinklers, fire doors. High-rise: EWS1 form essential.' },
        { id: 'ftb-cladding', text: 'Cladding & EWS1 form obtained (if flat)',                   tip: 'Without EWS1 on affected buildings, you may not be able to get a mortgage.' },
      ],
    },
    {
      id: 'ftb-location', title: 'Location & Lifestyle', icon: '📍', tag: undefined,
      items: [
        { id: 'ftb-commute',   text: 'Commute timed during actual peak hours',                    tip: 'Do the journey for real, at the time you\'d do it every day.' },
        { id: 'ftb-schools',   text: 'School catchment confirmed (affects resale)',               tip: 'Even without kids, being in a good catchment adds 5–15% to value.' },
        { id: 'ftb-noise',     text: 'Noise levels checked at different times',                   tip: 'Visit on a weekday morning, a Friday evening, and a Sunday.' },
        { id: 'ftb-parking',   text: 'Parking situation checked (permit zones, costs)',           tip: 'Permit zones can cost £200–400/yr per vehicle.' },
        { id: 'ftb-broadband', text: 'Broadband speed confirmed — FTTP preferred',                tip: 'Check Ofcom\'s broadband checker. Poor broadband affects home working and resale.' },
      ],
    },
    {
      id: 'ftb-negotiation', title: 'Negotiation Tips', icon: '💬', tag: undefined,
      items: [
        { id: 'ftb-sold',       text: 'Compared asking price with recent sold prices on street',   tip: 'Rightmove & Zoopla show sold prices. If asking price is high, negotiate.' },
        { id: 'ftb-reason',     text: 'Asked seller why they are moving',                          tip: 'Motivated sellers (relocation, divorce) are more negotiable.' },
        { id: 'ftb-defects',    text: 'Identified defects to raise in negotiation',               tip: 'Survey findings = legitimate price reduction requests. Don\'t be shy.' },
        { id: 'ftb-duration',   text: 'Checked how long the property has been listed',            tip: 'Over 3 months = more room to negotiate. Use Rightmove listing history.' },
      ],
    },
  ],
}

const BTL: Checklist = {
  id: 'btl', label: 'Buy-to-Let', emoji: '🏢',
  sections: [
    {
      id: 'btl-financial', title: 'Financial Metrics', icon: '📊', tag: undefined,
      items: [
        { id: 'btl-gross-yield',  text: 'Gross yield calculated (annual rent ÷ purchase price × 100)',      tip: 'Aim for 5%+ gross in most areas. London often 3–4%. Northern cities 6–8%.' },
        { id: 'btl-net-yield',    text: 'Net yield calculated (after all costs)',                           tip: 'Deduct: mortgage, management fees, insurance, maintenance, voids. Aim 4%+.' },
        { id: 'btl-cashflow',     text: 'Monthly cash flow calculated after mortgage',                      tip: 'Stress test at a rate 3% above current. Must be positive at higher rates.' },
        { id: 'btl-service-grent',text: 'Service charges & ground rent confirmed (if leasehold)',          tip: 'These eat directly into your yield. Get exact figures, not estimates.' },
        { id: 'btl-agent-fees',   text: 'Letting agent fees budgeted (8–15% of rent)',                     tip: 'Full management: 10–15%. Tenant-find only: 6–10%. Online agents: 1–5%.' },
        { id: 'btl-insurance',    text: 'Landlord insurance costs confirmed',                              tip: 'Includes buildings, contents, liability, and rent guarantee. Budget £300–600/yr.' },
        { id: 'btl-voids',        text: 'Void period allowance budgeted (4–6 weeks/year)',                  tip: 'Assume 4 weeks void per year minimum in your cash flow model.' },
        { id: 'btl-tax',          text: 'Income tax & capital gains implications understood',               tip: 'Since 2020, mortgage interest is no longer fully deductible. Get an accountant.' },
      ],
    },
    {
      id: 'btl-demand', title: 'Tenant Demand', icon: '👥', tag: undefined,
      items: [
        { id: 'btl-rental-demand', text: 'Rental demand in area verified (Rightmove, Zoopla listings)',    tip: 'Few available rentals = high demand. Check typical rental listing duration.' },
        { id: 'btl-employment',    text: 'Local employment hubs & anchor employers identified',            tip: 'NHS hospitals, universities, business parks drive consistent tenant demand.' },
        { id: 'btl-transport',     text: 'Transport links to employment centres assessed',                 tip: 'Proximity to a train station or tram stop = premium rental demand.' },
        { id: 'btl-students',      text: 'Student/HMO demand considered (if applicable)',                  tip: 'Higher yields but more wear, more management. Check local HMO licensing rules.' },
      ],
    },
    {
      id: 'btl-condition', title: 'Property Condition', icon: '🏗️', tag: undefined,
      items: [
        { id: 'btl-survey',  text: 'RICS survey completed',                                               tip: 'Even for investment purchases — surprise costs destroy yield calculations.' },
        { id: 'btl-epc',     text: 'EPC rating confirmed — minimum Band C incoming for rentals',          tip: 'Rental EPC C requirement is expected by 2028. Plan upgrade costs now.' },
        { id: 'btl-boiler',  text: 'Boiler age & condition confirmed (replacement budgeted)',              tip: 'A boiler failure during tenancy is your cost and responsibility.' },
        { id: 'btl-eicr',    text: 'EICR completed (mandatory for rental properties)',                    tip: 'Legally required for all rented properties. Must be renewed every 5 years.' },
        { id: 'btl-fire-comp', text: 'Fire safety compliance confirmed',                                  tip: 'Smoke alarms, CO detectors on all floors legally required since 2015.' },
      ],
    },
    {
      id: 'btl-legal', title: 'Legal & Compliance', icon: '📋', tag: undefined,
      items: [
        { id: 'btl-licensing',   text: 'HMO / selective licensing requirements checked',                  tip: 'HMO licence required for 5+ occupants from 2+ households. Check locally.' },
        { id: 'btl-r2r',         text: 'Right-to-rent obligations understood',                            tip: 'Landlords must check tenants\' right to rent in the UK. Fine up to £20k.' },
        { id: 'btl-lease-restrict', text: 'Lease restrictions on sub-letting checked (leasehold)',        tip: 'Many leases require freeholder permission to sublet. Breach can forfeit the lease.' },
        { id: 'btl-cladding',    text: 'Cladding & EWS1 form obtained (flats)',                          tip: 'Without EWS1, tenants can\'t get contents insurance and you can\'t sell.' },
      ],
    },
    {
      id: 'btl-market', title: 'Market & Area', icon: '📈', tag: undefined,
      items: [
        { id: 'btl-rental-comps', text: 'Rental comparables established (same street, same size)',        tip: 'Check Rightmove & Zoopla current listings. Discount by 5–10% for realism.' },
        { id: 'btl-cap-growth',   text: 'Capital growth trends reviewed (5–10 year view)',                tip: 'Yield + capital growth = total return. Don\'t ignore appreciation.' },
        { id: 'btl-crime',        text: 'Crime rates checked (affects tenant quality & insurance)',        tip: 'High-crime areas = higher insurance, lower quality tenants, harder to sell.' },
        { id: 'btl-regen',        text: 'Regeneration plans reviewed (council & national)',               tip: 'HS2 stops, Mayoral Development Zones, port redevelopment = price catalyst.' },
        { id: 'btl-amenities',    text: 'Local amenities assessed (shops, transport, schools)',            tip: 'Good amenities = wider tenant pool and stronger resale.' },
      ],
    },
    {
      id: 'btl-exit', title: 'Exit Strategy', icon: '🚪', tag: undefined,
      items: [
        { id: 'btl-resale',      text: 'Resale demand assessed (owner-occupier as well as investor)',     tip: 'A property only investors want is harder to sell when you need to exit.' },
        { id: 'btl-lease-exit',  text: 'Lease length checked for long-term exit (70+ years minimum)',    tip: 'Under 70 years at point of sale will significantly reduce buyer pool.' },
        { id: 'btl-maintenance', text: 'Long-term maintenance costs modelled',                            tip: 'Budget 1% of property value per year for maintenance as a rule of thumb.' },
      ],
    },
  ],
}

const CHECKLISTS: Checklist[] = [STANDARD, FTB, BTL]

// ─── Scoring matrix data ──────────────────────────────────────────────────────

const SCORE_CATEGORIES: ScoreCategory[] = [
  { id: 'structural',   label: 'Structural Condition',      weight: 20, description: 'Overall build quality, survey findings, age of roof, electrics, boiler' },
  { id: 'location',     label: 'Location & Amenities',      weight: 15, description: 'Transport, schools, shops, parks, employment hubs, future development' },
  { id: 'price-value',  label: 'Price vs Market Value',     weight: 15, description: 'How asking price compares to recent sold prices on same street' },
  { id: 'reno-costs',   label: 'Renovation Costs',          weight: 10, description: 'Estimated cost of all required works to make it your ideal home' },
  { id: 'leasehold',    label: 'Leasehold / Service Charges', weight: 10, description: 'Lease length, service charge level, sinking fund health, ground rent' },
  { id: 'safety',       label: 'Safety & Compliance',       weight: 10, description: 'EPC rating, electrics, gas, cladding, flood risk, fire safety' },
  { id: 'transport',    label: 'Transport & Connectivity',  weight: 10, description: 'Commute time, broadband speed, mobile coverage, parking availability' },
  { id: 'growth',       label: 'Future Growth Potential',   weight: 10, description: 'Area price trends, regeneration plans, rental demand, local employers' },
]

const SCORE_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Below avg', 3: 'Average', 4: 'Good', 5: 'Excellent',
}

const SCORE_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#84cc16', 5: '#22c55e',
}

function verdict(score: number): { label: string; color: string; bg: string; emoji: string } {
  if (score >= 4.0) return { label: 'Strong buy',           color: '#166534', bg: '#dcfce7', emoji: '🟢' }
  if (score >= 3.0) return { label: 'Good prospect',        color: '#713f12', bg: '#fef9c3', emoji: '🟡' }
  if (score >= 2.0) return { label: 'Proceed with caution', color: '#7c2d12', bg: '#ffedd5', emoji: '🟠' }
  return                    { label: 'High risk',            color: '#7f1d1d', bg: '#fee2e2', emoji: '🔴' }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  standard: 'pp-checklist-standard',
  ftb:      'pp-checklist-ftb',
  btl:      'pp-checklist-btl',
  scores:   'pp-checklist-scores',
}

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = 'standard' | 'ftb' | 'btl' | 'score'

export default function ChecklistPage() {
  const [tab,      setTab]      = useState<TabId>('standard')
  const [checked,  setChecked]  = useState<Record<string, Record<string, boolean>>>({
    standard: {}, ftb: {}, btl: {},
  })
  const [scores,   setScores]   = useState<Record<string, number>>(
    () => Object.fromEntries(SCORE_CATEGORIES.map(c => [c.id, 3]))
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [tips,     setTips]     = useState<string | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const loaded: typeof checked = { standard: {}, ftb: {}, btl: {} }
      for (const k of ['standard', 'ftb', 'btl'] as const) {
        const raw = localStorage.getItem(STORAGE_KEYS[k])
        if (raw) loaded[k] = JSON.parse(raw)
      }
      setChecked(loaded)

      const rawScores = localStorage.getItem(STORAGE_KEYS.scores)
      if (rawScores) setScores(JSON.parse(rawScores))
    } catch {}
  }, [])

  const toggle = (listId: string, itemId: string) => {
    setChecked(prev => {
      const next = { ...prev, [listId]: { ...prev[listId], [itemId]: !prev[listId]?.[itemId] } }
      try { localStorage.setItem(STORAGE_KEYS[listId as keyof typeof STORAGE_KEYS], JSON.stringify(next[listId])) } catch {}
      return next
    })
  }

  const setScore = (id: string, val: number) => {
    setScores(prev => {
      const next = { ...prev, [id]: val }
      try { localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const toggleSection = (id: string) =>
    setExpanded(p => ({ ...p, [id]: p[id] === false ? true : !p[id] }))

  const clearList = (listId: string) => {
    setChecked(prev => {
      const next = { ...prev, [listId]: {} }
      try { localStorage.setItem(STORAGE_KEYS[listId as keyof typeof STORAGE_KEYS], JSON.stringify({})) } catch {}
      return next
    })
  }

  // Progress helpers
  const progress = (list: Checklist) => {
    const items = list.sections.flatMap(s => s.items)
    const done  = items.filter(i => checked[list.id]?.[i.id]).length
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) }
  }

  const sectionProgress = (listId: string, section: Section) => {
    const done = section.items.filter(i => checked[listId]?.[i.id]).length
    return { done, total: section.items.length }
  }

  // Scoring helpers
  const weightedScore = () => {
    const total = SCORE_CATEGORIES.reduce((sum, c) => sum + (scores[c.id] ?? 3) * (c.weight / 100), 0)
    return Math.round(total * 10) / 10
  }

  const activeList = CHECKLISTS.find(c => c.id === tab)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <NavBar
        rightSlot={<>
          <Link href="/homebuyer" style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>Homebuyer Check</Link>
          <Link href="/tools"     style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>← All tools</Link>
        </>}
        mobileItems={[
          { label: 'Homebuyer Check', href: '/homebuyer' },
          { label: '← All tools',     href: '/tools' },
        ]}
      />

      <main style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(32px,5vw,52px) clamp(16px,4vw,40px) 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Free homebuyer tools</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>Property Buying Checklists</h1>
          <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
            Interactive checklists for every type of buyer — tick items off as you go and your progress is saved automatically in your browser.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, borderBottom: '1px solid #e2ddd6', paddingBottom: 0 }}>
          {([
            { id: 'standard', label: '🧾 Full checklist' },
            { id: 'ftb',      label: '🏡 First-time buyer' },
            { id: 'btl',      label: '🏢 Buy-to-let' },
            { id: 'score',    label: '📊 Score a property' },
          ] as { id: TabId; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                background: tab === t.id ? '#1D9E75' : 'transparent',
                color: tab === t.id ? '#fff' : '#5e5a52',
                border: 'none', borderRadius: '8px 8px 0 0',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                marginBottom: -1, position: 'relative',
                borderBottom: tab === t.id ? '2px solid #1D9E75' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Checklist tabs ── */}
        {activeList && (() => {
          const p = progress(activeList)
          return (
            <div>
              {/* Progress bar */}
              <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1917' }}>
                      {activeList.emoji} {activeList.label} progress
                    </span>
                    <span style={{ fontSize: 13, color: '#5e5a52' }}>{p.done}/{p.total} items</span>
                  </div>
                  <div style={{ height: 8, background: '#e2ddd6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct === 100 ? '#22c55e' : '#1D9E75', borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 20, fontWeight: 700, color: p.pct === 100 ? '#22c55e' : '#1D9E75',
                    fontFamily: 'var(--font-display)',
                  }}>{p.pct}%</span>
                  {p.done > 0 && (
                    <button
                      onClick={() => clearList(activeList.id)}
                      style={{ fontSize: 12, color: '#9e998f', background: 'none', border: '1px solid #e2ddd6', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Tip panel */}
              {tips && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                  <strong>💡 Tip:</strong> {tips}
                  <button onClick={() => setTips(null)} style={{ marginLeft: 12, fontSize: 11, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeList.sections.map(section => {
                  const sp      = sectionProgress(activeList.id, section)
                  const isOpen  = expanded[section.id] !== false  // open by default
                  const allDone = sp.done === sp.total

                  return (
                    <div key={section.id} style={{ background: '#fff', border: `1px solid ${allDone ? '#86efac' : '#e2ddd6'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '16px 20px', background: allDone ? '#f0fdf4' : '#fff',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{section.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', flex: 1 }}>{section.title}</span>
                        {section.tag && (
                          <span style={{
                            fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: 20,
                            background: section.tag === 'Mandatory' ? '#fee2e2' : section.tag === 'If applicable' ? '#fef9c3' : '#f1f5f9',
                            color: section.tag === 'Mandatory' ? '#dc2626' : section.tag === 'If applicable' ? '#b45309' : '#475569',
                          }}>
                            {section.tag}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: allDone ? '#16a34a' : '#9e998f', fontWeight: 500, flexShrink: 0 }}>
                          {sp.done}/{sp.total}
                        </span>
                        <span style={{ fontSize: 14, color: '#9e998f', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                      </button>

                      {/* Items */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #f0ede8' }}>
                          {section.items.map((item, idx) => {
                            const done = !!checked[activeList.id]?.[item.id]
                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 12,
                                  padding: '12px 20px',
                                  borderBottom: idx < section.items.length - 1 ? '1px solid #f8f7f4' : 'none',
                                  background: done ? '#f0fdf4' : '#fff',
                                  transition: 'background 0.15s',
                                }}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggle(activeList.id, item.id)}
                                  style={{
                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                    background: done ? '#1D9E75' : '#fff',
                                    border: `2px solid ${done ? '#1D9E75' : '#d1d5db'}`,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s', marginTop: 1,
                                  }}
                                  aria-label={done ? 'Uncheck' : 'Check'}
                                >
                                  {done && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
                                </button>

                                {/* Text */}
                                <span
                                  style={{ fontSize: 13, color: done ? '#5e5a52' : '#1a1917', flex: 1, lineHeight: 1.6, textDecoration: done ? 'line-through' : 'none', cursor: 'pointer' }}
                                  onClick={() => toggle(activeList.id, item.id)}
                                >
                                  {item.text}
                                </span>

                                {/* Tip button */}
                                {item.tip && (
                                  <button
                                    onClick={() => setTips(tips === item.tip ? null : item.tip!)}
                                    style={{ fontSize: 13, color: '#9e998f', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
                                    title="Show tip"
                                  >
                                    💡
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {p.pct === 100 && (
                <div style={{ marginTop: 24, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 16, fontWeight: 500, color: '#166534', margin: '0 0 4px' }}>✓ Checklist complete!</p>
                  <p style={{ fontSize: 13, color: '#15803d', margin: 0 }}>All {p.total} items checked. Use the Score a Property tab to compare properties.</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Scoring tab ── */}
        {tab === 'score' && (() => {
          const ws = weightedScore()
          const v  = verdict(ws)
          const allScored = SCORE_CATEGORIES.every(c => scores[c.id] > 0)

          return (
            <div>
              <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: 'clamp(20px,4vw,32px)', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', marginBottom: 6 }}>
                  Property Risk & Value Scorer
                </h2>
                <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 24px', lineHeight: 1.6 }}>
                  Rate each category 1–5 to get a weighted score. Use this to compare multiple properties objectively.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {SCORE_CATEGORIES.map(cat => {
                    const s = scores[cat.id] ?? 3
                    return (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1917' }}>{cat.label}</span>
                            <span style={{ fontSize: 11, color: '#9e998f', marginLeft: 8 }}>(weight: {cat.weight}%)</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: SCORE_COLORS[s] }}>
                            {s}/5 — {SCORE_LABELS[s]}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#9e998f', margin: '0 0 10px', lineHeight: 1.5 }}>{cat.description}</p>
                        {/* 1-5 buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setScore(cat.id, n)}
                              style={{
                                flex: 1, height: 40, fontSize: 14, fontWeight: 600,
                                borderRadius: 8, cursor: 'pointer',
                                border: `2px solid ${s === n ? SCORE_COLORS[n] : '#e2ddd6'}`,
                                background: s === n ? SCORE_COLORS[n] : '#fff',
                                color: s === n ? '#fff' : '#5e5a52',
                                transition: 'all 0.15s',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Score summary */}
              <div style={{ background: allScored ? v.bg : '#fff', border: `1px solid ${allScored ? '#d1d5db' : '#e2ddd6'}`, borderRadius: 14, padding: 'clamp(20px,4vw,28px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#9e998f', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Weighted total score</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: SCORE_COLORS[Math.round(ws)], margin: 0 }}>
                      {ws.toFixed(1)} <span style={{ fontSize: 18, color: '#9e998f' }}>/ 5.0</span>
                    </p>
                  </div>
                  <div style={{ background: v.bg, border: `1px solid ${v.color}30`, borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, margin: '0 0 4px' }}>{v.emoji}</p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: v.color, margin: 0 }}>{v.label}</p>
                  </div>
                </div>

                {/* Breakdown table */}
                <div style={{ borderTop: '1px solid #e2ddd6', paddingTop: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#9e998f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Score breakdown</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SCORE_CATEGORIES.map(cat => {
                      const s           = scores[cat.id] ?? 3
                      const contribution = (s * cat.weight / 100)
                      return (
                        <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#5e5a52', flex: 1, minWidth: 0 }}>{cat.label}</span>
                          <div style={{ width: 80, height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${(s / 5) * 100}%`, background: SCORE_COLORS[s], borderRadius: 3, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: SCORE_COLORS[s], width: 22, textAlign: 'center', flexShrink: 0 }}>{s}</span>
                          <span style={{ fontSize: 11, color: '#9e998f', width: 44, textAlign: 'right', flexShrink: 0 }}>+{contribution.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Score guide */}
                <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { range: '4.0–5.0', label: 'Strong buy',           emoji: '🟢' },
                    { range: '3.0–3.9', label: 'Good prospect',        emoji: '🟡' },
                    { range: '2.0–2.9', label: 'Proceed with caution', emoji: '🟠' },
                    { range: '1.0–1.9', label: 'High risk',            emoji: '🔴' },
                  ].map(g => (
                    <span key={g.range} style={{ fontSize: 11, color: '#5e5a52', background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 20, padding: '3px 10px' }}>
                      {g.emoji} {g.range}: {g.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Footer note */}
        <div style={{ marginTop: 28, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#451a03', margin: 0, lineHeight: 1.6 }}>
            <strong>Browser storage:</strong> Your checklist progress and scores are saved in your browser and are private to this device. They will be lost if you clear your browser data. <Link href="/login" style={{ color: '#92400e' }}>Sign in to PropPilot</Link> to get cloud-synced progress saving.
          </p>
        </div>
      </main>
    </div>
  )
}
