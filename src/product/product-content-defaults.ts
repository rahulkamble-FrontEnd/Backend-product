/**
 * Default product content from CF Studio Completed Data v2.0.
 * Applied on create when description, pros, cons, or application are empty.
 */
export type ProductContentDefault = {
  parents: string[];
  subcategories: string[];
  thicknessMm?: number;
  description: string;
  pros: string[];
  cons: string[];
  application: string;
};

export const PRODUCT_CONTENT_DEFAULTS: ProductContentDefault[] = [
  // Laminates 1 mm
  {
    parents: ['finishes'],
    subcategories: ['laminates', 'laminate'],
    thicknessMm: 1,
    description:
      'Preferred for highly visible and frequently used external surfaces such as shutters, wardrobe fronts and furniture facades. Provides a more substantial surface layer and is available in a wide variety of premium finishes and textures.',
    pros: [
      'More robust surface',
      'Better suited to high-use areas',
      'Resistance to minor impact and wear',
      'Extensive choice of finishes',
      'Premium feel',
    ],
    cons: [
      'More expensive than thinner laminates',
      'Adds slightly more thickness and weight',
      'Not necessary for every application',
    ],
    application: 'Wardrobe externals and shutters',
  },
  // Laminates 0.92 mm
  {
    parents: ['finishes'],
    subcategories: ['laminates', 'laminate'],
    thicknessMm: 0.92,
    description:
      'Decorative laminate with 0.92 mm thickness, suitable for visible furniture surfaces such as wardrobe shutters and cabinet fronts. Offers a practical balance of appearance, everyday durability and cost.',
    pros: [
      'Good balance of durability and value',
      'Decorative finish options',
      'Easy to wipe clean',
      'Suitable for everyday-use shutters',
    ],
    cons: [
      'Slightly less robust than 1 mm under heavy use or impact',
      'Limited finish and colour options',
    ],
    application: 'Wardrobe externals and shutters',
  },
  // Laminates 0.8 mm
  {
    parents: ['finishes'],
    subcategories: ['laminates', 'laminate'],
    thicknessMm: 0.8,
    description:
      'A medium-thickness laminate that provides a good balance between durability, appearance and cost. Suitable for a wide range of furniture surfaces where the additional thickness of a 1 mm laminate may not be required.',
    pros: [
      'Good durability',
      'Lighter and more economical than 1 mm',
      'Suitable for many furniture applications',
      'Good balance of performance and price',
    ],
    cons: [
      'Slightly less robust than 1 mm under heavy use or impact',
      'Limited finish and colour options',
    ],
    application: 'Wardrobe externals, wardrobe internals',
  },
  // Laminates 0.72 mm
  {
    parents: ['finishes'],
    subcategories: ['laminates', 'laminate'],
    thicknessMm: 0.72,
    description:
      'A thinner decorative laminate suitable for surfaces where heavy-duty performance is not required. Commonly used for wardrobe inner surfaces.',
    pros: [
      'Economical',
      'Lightweight',
      'Adequate for lower-wear applications',
      'Useful for optimising overall furniture cost',
    ],
    cons: [
      'Less impact-resistant than thicker laminates',
      'Less suitable for heavily used external surfaces',
      'Limited finish and colour options',
    ],
    application: 'Wardrobe internals',
  },
  // Acrylics
  {
    parents: ['finishes'],
    subcategories: ['acrylic', 'acrylics'],
    description:
      'Glossy or matte decorative surface used to give furniture a sleek, contemporary appearance.',
    pros: ['Rich colours', 'Smooth appearance', 'Easy surface cleaning'],
    cons: [
      'Premium pricing, glossy finishes may show fingerprints and fine scratches more easily and require gentle cleaning and maintenance.',
    ],
    application: 'Kitchen shutters; wardrobe shutters',
  },
  // PU Paint
  {
    parents: ['finishes'],
    subcategories: ['pu paints', 'pu paint', 'pu painted'],
    description:
      'Polyurethane coating applied to prepared panels for a seamless-looking premium furniture finish.',
    pros: [
      'Premium and refined finish, available in many colours',
      'Matte or glossy options',
    ],
    cons: ['Higher cost', 'Longer finishing time'],
    application: 'Wardrobe shutters; decorative panels',
  },
  // Granite
  {
    parents: ['counter-tops'],
    subcategories: ['granite'],
    description:
      'Natural stone countertop material with unique grains and colour variation.',
    pros: ['Natural appearance, heat resistance, durable, scratch-resistant.'],
    cons: [
      'Lighter colours are susceptible to staining, natural colour variations, visible joints.',
    ],
    application:
      'Kitchen countertops, vanity countertops, other unit countertops',
  },
  // Quartz
  {
    parents: ['counter-tops'],
    subcategories: ['quartz'],
    description:
      'Manufactured stone surface made with mineral aggregates and binders for consistent countertop finishes.',
    pros: [
      'Premium appearance, non-porous, stain-resistant, low maintenance, uniform finish.',
    ],
    cons: ['Higher cost, sensitive to excessive heat'],
    application:
      'Kitchen countertops, vanity countertops, other unit countertops',
  },
  // Wall trims
  {
    parents: ['wall-decoratives', 'wall-decorative'],
    subcategories: ['wall trims', 'wall trim'],
    description:
      'Decorative mouldings and profiles used to create patterns, borders and elegant detailing on walls.',
    pros: [
      'Enhances wall aesthetics',
      'Creates a premium look',
      'Available in various designs and finishes',
      'Can be painted to match interiors',
    ],
    cons: [
      'Additional installation and finishing costs',
      'Grooves may collect dust',
      'Susceptible to dents or damage',
    ],
    application:
      'Living room walls, bedroom walls, dining areas, foyers, TV unit backdrops, accent walls.',
  },
  // Wall panels
  {
    parents: ['wall-decoratives', 'wall-decorative'],
    subcategories: ['wall panels', 'wall panel'],
    description:
      'Decorative panels available in various textures, patterns and finishes, used to create accent walls and enhance interiors.',
    pros: [
      'Premium appearance',
      'Wide variety of designs and textures',
      'Can conceal minor wall imperfections',
      'Easy to maintain',
    ],
    cons: [
      'Higher cost than paint',
      'Moisture resistance varies by material',
      'Damaged panels may require replacement',
    ],
    application:
      'TV unit backdrops, bedroom headboard walls, living room feature walls, dining areas, foyers, passage walls.',
  },
  // Wall paper
  {
    parents: ['wall-decoratives', 'wall-decorative'],
    subcategories: ['wall papers', 'wall paper', 'wallpaper', 'wallpapers'],
    description:
      'Printed or textured decorative wall covering available in a wide range of patterns.',
    pros: [
      'Wide design variety',
      'Quick installation',
      'Creates attractive feature walls',
      'Can be replaced to refresh interiors',
    ],
    cons: [
      'Can peel in humid conditions',
      'Susceptible to scratches and tears',
      'Some varieties are difficult to clean',
      'Requires a smooth, dry wall surface',
    ],
    application: 'Walls, shutters, foyers, TV unit backdrops, accent walls.',
  },
  // Handles
  {
    parents: ['handles-knobs'],
    subcategories: ['handles', 'handle'],
    description:
      'Functional hardware used to open and close shutters and drawers, available in various designs, sizes and finishes.',
    pros: [
      'Easy to grip',
      'Wide variety of designs and finishes',
      'Suitable for large shutters and drawers',
      'Enhances furniture aesthetics',
    ],
    cons: [
      'Protruding designs may snag clothing',
      'Finishes may scratch or show fingerprints',
      'Require occasional cleaning',
    ],
    application:
      'Wardrobe shutters, kitchen cabinets, drawers, TV units, vanity units, storage cabinets.',
  },
  // Knobs
  {
    parents: ['handles-knobs'],
    subcategories: ['knobs', 'knob'],
    description:
      'Compact decorative hardware used to open shutters and drawers, available in various shapes, materials and finishes.',
    pros: [
      'Minimal appearance',
      'Space-efficient',
      'Compact and stylish',
      'Affordable',
      'Easy to install and replace',
      'Adds decorative appeal',
    ],
    cons: [
      'Smaller grip area',
      'Less convenient for heavy shutters and large drawers',
      'May loosen with frequent use',
    ],
    application:
      'Bedside tables, dresser drawers, vanity units, small cabinets, storage units.',
  },
  // Cob
  {
    parents: ['lighting'],
    subcategories: ['cob'],
    description:
      'Chip-on-Board LED light that provides focused, bright illumination with a sleek, modern appearance. Packs multiple tiny LED chips onto a single small module, creating an intense, focused, and directional beam.',
    pros: [
      'Bright, focused lighting',
      'Energy-efficient',
      'Premium appearance',
      'Good colour rendering',
    ],
    cons: [
      'Higher cost',
      'May cause glare if poorly positioned',
      'Limited light spread',
    ],
    application:
      'False ceilings, living rooms, bedrooms, kitchens, accent lighting, display areas.',
  },
  // Panel
  {
    parents: ['lighting'],
    subcategories: ['panel'],
    description:
      'Slim LED light panel that provides uniform, diffused illumination across a wide area. Spreads many smaller LED diodes across a wide, flat surface behind a milky-white diffuser to cast broad, soft, and even ambient light',
    pros: [
      'Even light distribution',
      'Energy-efficient',
      'Minimal glare',
      'Sleek design',
      'Affordable',
    ],
    cons: [
      'Limited decorative appeal',
      'Less suitable for highlighting specific areas',
    ],
    application:
      'False ceilings, kitchens, bedrooms, living rooms, offices, utility areas.',
  },
  // Strip
  {
    parents: ['lighting'],
    subcategories: ['strip'],
    description:
      'Flexible LED strip used to provide concealed, decorative or ambient lighting.',
    pros: [
      'Flexible installation',
      'Creates ambient lighting',
      'Energy-efficient',
      'Enhances furniture aesthetics',
      'Available in various colours',
    ],
    cons: [
      'Lower brightness for general lighting',
      'Requires driver and proper installation',
      'May show individual LED dots without diffuser',
      'Adhesive may weaken over time',
    ],
    application:
      'False ceiling, wardrobe interiors, kitchen under-cabinets, TV units, display shelves, cove lighting, headboards.',
  },
  // Spot
  {
    parents: ['lighting'],
    subcategories: ['spot'],
    description:
      'Compact directional light designed to focus illumination on specific areas or objects.',
    pros: [
      'Focused illumination',
      'Ideal for highlighting décor',
      'Compact design',
      'Available in adjustable options',
    ],
    cons: ['Limited coverage', 'May create shadows or glare'],
    application:
      'Display units, artwork, accent walls, wardrobes, living rooms, false ceilings.',
  },
  // Track
  {
    parents: ['lighting'],
    subcategories: ['track'],
    description:
      'Adjustable lighting system with multiple light fixtures mounted on a continuous track.',
    pros: [
      'Flexible positioning',
      'Adjustable direction',
      'Modern appearance',
      'Ideal for accent lighting',
      'Fixtures can be repositioned',
    ],
    cons: [
      'Higher cost',
      'Tracks remain visible',
      'Requires compatible fixtures',
      'May cause glare if incorrectly positioned',
    ],
    application:
      'Living rooms, dining areas, galleries, display walls, home offices, feature walls.',
  },
  // BWP Plywood
  {
    parents: ['core-materials'],
    subcategories: ['bwp', 'bwp plywood'],
    description:
      'Boiling Water Proof plywood made from bonded wood veneers, designed for high moisture resistance and durability.',
    pros: [
      'Excellent moisture resistance',
      'Strong and durable',
      'Good screw-holding capacity',
      'Suitable for moisture-prone areas',
    ],
    cons: [
      'Higher cost',
      'Quality varies by brand and grade',
      'Edges require proper sealing',
      'Surface may not be as smooth and uniform as HDHMR or MDF, making it less suitable for shutters requiring a flawless finish',
    ],
    application:
      'Wardrobe carcasses and shutters, lofts, TV units, wall units, storage cabinets, kitchen shutters.',
  },
  // HDHMR
  {
    parents: ['core-materials'],
    subcategories: ['hdhmr'],
    description:
      'High Density High Moisture Resistance engineered wood board with a smooth, dense surface, suitable for modular furniture.',
    pros: [
      'High density and strength',
      'Good moisture resistance',
      'Smooth finish',
      'Good screw-holding capacity',
      'Suitable for precision machining',
    ],
    cons: [
      'Not waterproof',
      'Prolonged water exposure can cause swelling',
      'Heavier than MDF',
      'Edges require proper sealing',
    ],
    application:
      'Wardrobe carcasses and shutters, lofts, TV units, wall units, storage cabinets, kitchen shutters.',
  },
  // MDF
  {
    parents: ['core-materials'],
    subcategories: ['mdf'],
    description:
      'Medium Density Fibreboard engineered from compressed wood fibres, offering a smooth, uniform surface for decorative finishes.',
    pros: [
      'Smooth surface',
      'Ideal for painted and routed designs',
      'Easy to machine',
      'Cost-effective',
      'Consistent finish',
    ],
    cons: [
      'Lower moisture resistance',
      'Prone to swelling when wet',
      'Generally lower screw-holding strength than HDHMR and plywood',
    ],
    application:
      'Decorative shutters, wardrobe shutters, routed panels, PU-painted furniture, wall panels, decorative mouldings.',
  },
  // WPC
  {
    parents: ['core-materials'],
    subcategories: ['wpc'],
    description:
      'Wood Plastic Composite board made from wood-based fillers and polymers, designed for high water and moisture resistance.',
    pros: [
      'Highly water-resistant',
      'Termite-resistant',
      'Low maintenance',
      'Suitable for wet areas',
      'Does not swell like conventional wood-based boards',
    ],
    cons: [
      'Higher cost',
      'Screw-holding strength and rigidity vary by grade',
      'Limited finishing and colour options',
    ],
    application:
      'Kitchen sink carcasses, bathroom vanity carcasses, utility cabinets, moisture-prone areas.',
  },
  // Prelam HDHMR Acrylic
  {
    parents: ['core-materials'],
    subcategories: ['prelam hdhmr acrylic'],
    description:
      'High-density, moisture-resistant HDHMR board with a factory-applied acrylic surface offering a smooth, high-gloss finish.',
    pros: [
      'Premium glossy appearance',
      'Good moisture resistance',
      'Smooth, uniform finish',
      'Easy to clean',
      'Good durability',
    ],
    cons: [
      'Higher cost',
      'Fingerprints and fine scratches may be visible',
      'Limited colour options',
    ],
    application:
      'Kitchen shutters, wardrobe shutters, TV units, storage cabinets.',
  },
  // Prelam MDFAcrylic
  {
    parents: ['core-materials'],
    subcategories: ['prelam mdf acrylic', 'prelam mdfacrylic'],
    description:
      'MDF board with a factory-applied acrylic surface providing a smooth, high-gloss decorative finish.',
    pros: [
      'Premium glossy appearance',
      'Smooth, uniform surface',
      'Wide colour options',
      'Easy to clean',
    ],
    cons: [
      'Lower moisture resistance than HDHMR',
      'Susceptible to swelling if exposed to water',
      'Fingerprints and scratches may be visible',
      'Limited colour options',
    ],
    application:
      'Wardrobe shutters, TV units, bedroom cabinets, decorative shutters.',
  },
  // Prelam UV Coated
  {
    parents: ['core-materials'],
    subcategories: ['prelam uv coated'],
    description:
      'Engineered wood board with a factory-applied UV-cured coating that provides a smooth, glossy or matte decorative finish',
    pros: [
      'Smooth, uniform finish',
      'Attractive appearance',
      'Easy to clean',
      'Good surface hardness',
    ],
    cons: [
      'Surface may scratch or chip',
      'Moisture resistance depends on core material',
      'Finish quality varies by manufacturer',
    ],
    application:
      'Wardrobe shutters, kitchen shutters (subject to core suitability), TV units, decorative cabinets.',
  },
  // Prelam HDHMR Matte
  {
    parents: ['core-materials'],
    subcategories: ['prelam hdhmr matte'],
    description:
      'High-density, moisture-resistant HDHMR board with a factory-applied matte decorative surface for a subtle, contemporary finish.',
    pros: [
      'Elegant matte appearance',
      'Good moisture resistance',
      'Reduced reflections',
      'Fingerprints generally less noticeable than on glossy finishes',
      'Easy maintenance',
    ],
    cons: [
      'Not waterproof',
      'Edges require proper sealing',
      'Limited colour options',
    ],
    application:
      'Wardrobe shutters, kitchen shutters, TV units, storage cabinets, wall units.',
  },
  // Prelam MDF Matte
  {
    parents: ['core-materials'],
    subcategories: ['prelam mdf matte'],
    description:
      'MDF board with a factory-applied matte decorative surface offering a smooth, understated finish.',
    pros: [
      'Smooth, uniform appearance',
      'Contemporary matte finish',
      'Cost-effective',
    ],
    cons: [
      'Lower moisture resistance',
      'Less suitable for moisture-prone areas',
      'Limited colour options',
    ],
    application:
      'Wardrobe shutters, bedroom cabinets, TV units, study units, decorative panels.',
  },
  // Dado Tiles
  {
    parents: ['flooring-tiles'],
    subcategories: ['dado tiles', 'dado tile', 'dado'],
    description:
      'kitchen countertops or other work surfaces to protect walls from water, stains and splashes.',
    pros: [
      'Water-resistant',
      'Easy to clean',
      'Durable',
      'Available in various colours, patterns and finishes',
      'Protects walls from stains',
    ],
    cons: ['Grout joints may collect dirt', 'Installation requires precision'],
    application:
      'Kitchen backsplashes, utility areas, wash areas, bathroom walls.',
  },
  // Wooden Flooring
  {
    parents: ['flooring-tiles'],
    subcategories: ['wooden flooring', 'wooden floorings', 'wood flooring'],
    description:
      'Wood or wood-look flooring available in natural wood, engineered wood and laminate options, offering a warm, elegant appearance.',
    pros: [
      'Premium appearance',
      'Warm and comfortable underfoot',
      'Wide variety of colours and textures',
      'Enhances interior aesthetics',
    ],
    cons: [
      'Susceptible to moisture damage',
      'Requires careful cleaning',
      'May expand or warp with excess moisture',
      'Higher maintenance than tiles',
    ],
    application:
      'Bedrooms, living rooms, dining areas, study rooms, home offices.',
  },
  // Plain
  {
    parents: ['glass'],
    subcategories: ['plain'],
    description:
      'Clear, transparent glass offering a clean, modern appearance and unobstructed visibility.',
    pros: [
      'Allows light transmission',
      'Creates an open, spacious look',
      'Versatile',
      'Easy to clean',
      'Cost-effective',
    ],
    cons: ['Shows fingerprints and smudges', 'Offers no privacy'],
    application:
      'Display cabinets, crockery units, glass shelves, decorative partitions, cabinet shutters.',
  },
  // Frosted
  {
    parents: ['glass'],
    subcategories: ['frosted'],
    description:
      'Glass with a translucent, matte surface that diffuses light while providing partial privacy.',
    pros: [
      'Provides privacy',
      'Allows light transmission',
      'Elegant appearance',
      'Reduces direct visibility of contents',
    ],
    cons: [
      'Limited transparency',
      'Surface can be difficult to clean depending on finish',
    ],
    application:
      'Wardrobe shutters, kitchen cabinets, partitions, storage units.',
  },
  // Tinted
  {
    parents: ['glass'],
    subcategories: ['tinted'],
    description:
      'Glass with added colour, available in shades such as grey, bronze and black for a sophisticated appearance.',
    pros: [
      'Premium appearance',
      'Reduces glare',
      'Adds decorative appeal',
      'Partially conceals cabinet contents',
      'Available in various shades',
    ],
    cons: [
      'Reduced light transmission',
      'Darker shades may require internal lighting, more expensive than plain glass',
    ],
    application:
      'Wardrobe shutters, crockery units, display cabinets, bar units, decorative partitions.',
  },
  // Toughened
  {
    parents: ['glass'],
    subcategories: ['toughened'],
    description:
      'Heat-treated safety glass designed to offer greater strength and impact resistance than ordinary glass.',
    pros: [
      'Stronger than regular glass',
      'Improved impact and thermal resistance',
      'Suitable for frequent-use areas',
    ],
    cons: [
      'Higher cost',
      'Cannot be cut or drilled after toughening',
      'May still shatter under impact',
      'Requires precise measurements',
    ],
    application: 'Wardrobe shutters, partitions, shower enclosures',
  },
  // Fluted
  {
    parents: ['glass'],
    subcategories: ['fluted'],
    description:
      'Decorative glass with vertical or patterned grooves that create a textured, partially obscured appearance.',
    pros: [
      'Premium contemporary look',
      'Adds texture and depth',
      'Diffuses light',
      'Partially conceals contents',
      'Enhances aesthetics',
    ],
    cons: [
      'Grooves may collect dust',
      'More difficult to clean',
      'Limited clear visibility',
      'Higher cost than plain glass',
    ],
    application:
      'Wardrobe shutters, kitchen cabinets, crockery units, bar units, decorative partitions, display units.',
  },
  // Lacquered
  {
    parents: ['glass'],
    subcategories: ['lacquered', 'lacquered glass'],
    description:
      'Glass with a coloured lacquer coating applied to the back, creating a smooth, opaque decorative finish.',
    pros: [
      'Premium glossy appearance',
      'Wide colour options',
      'Smooth and easy-to-clean front surface',
      'Uniform finish',
    ],
    cons: ['Higher cost', 'Coating may be damaged if improperly handled'],
    application:
      'Kitchen backsplashes, wardrobe shutters, TV units, wall panels, decorative cabinet shutters.',
  },
  // Laminated
  {
    parents: ['glass'],
    subcategories: ['laminated'],
    description:
      'Safety glass made by bonding two or more glass layers with an interlayer',
    pros: [
      'Enhanced safety',
      'Holds broken fragments together',
      'Improved sound insulation',
      'Available in decorative and tinted options',
    ],
    cons: ['Higher cost', 'Heavier than single glass'],
    application:
      'Glass partitions, wardrobe shutters, cabinet shutters, decorative panels',
  },
  // Plain
  {
    parents: ['mirrors', 'mirror'],
    subcategories: ['plain'],
    description:
      'Standard reflective mirror with a clear, smooth surface, offering accurate reflections and a clean appearance.',
    pros: [
      'Clear reflection',
      'Makes spaces appear larger and brighter',
      'Versatile',
      'Easy to clean',
      'Cost-effective',
    ],
    cons: [
      'Shows fingerprints and watermarks',
      'Susceptible to scratches and breakage',
      'Edges may deteriorate with moisture exposure',
    ],
    application:
      'Wardrobe shutters, dressing units, bathroom vanities, wall mirrors, foyers.',
  },
  // Tinted
  {
    parents: ['mirrors', 'mirror'],
    subcategories: ['tinted'],
    description:
      'Decorative mirror with a coloured reflective surface, available in shades such as bronze, grey and gold for a premium appearance.',
    pros: [
      'Elegant, premium look',
      'Adds depth and warmth',
      'Available in various shades',
      'Enhances decorative interiors',
    ],
    cons: ['Higher cost', 'Less suitable for grooming'],
    application:
      'Wardrobe and unit shutters, cabinet shutters, decorative wall panels, foyers',
  },
  // V Groove
  {
    parents: ['mirrors', 'mirror'],
    subcategories: ['v groove', 'vgroove'],
    description:
      'Decorative mirror with precision-cut V-shaped grooves that create elegant patterns and geometric designs.',
    pros: [
      'Premium decorative appearance',
      'Customizable patterns',
      'Adds visual depth',
      'Enhances feature walls',
    ],
    cons: [
      'Higher cost',
      'Grooves may collect dust',
      'Requires careful cleaning',
    ],
    application:
      'Decorative wall panels, foyers, unit and cabinet backdrops, wall highlighting',
  },
  // Fabric
  {
    parents: ['fabrics', 'fabric'],
    subcategories: ['fabric', 'fabrics', 'fabrics 2'],
    description:
      'Soft decorative material available in various colours, textures and patterns, used for upholstery and upholstered wall panels.',
    pros: [
      'Adds warmth and comfort',
      'Premium appearance',
      'Wide variety of colours and textures',
      'Enhances aesthetics',
      'Can improve sound absorption',
    ],
    cons: [
      'Susceptible to stains, dust and fading',
      'Requires regular cleaning',
      'May absorb moisture and odours',
      'Durability varies by fabric type',
    ],
    application:
      'Upholstered headboards, bedroom wall panels, padded wall panels, seating units, decorative feature walls.',
  },
  // Accessories
  {
    parents: ['hardware'],
    subcategories: ['accessories'],
    description:
      'Functional hardware fittings designed to improve storage, organization and convenience in modular furniture.',
    pros: [
      'Improves organization',
      'Maximizes storage efficiency',
      'Easy access',
      'Wide variety of options',
      'Enhances functionality',
    ],
    cons: ['Load capacity varies', 'Moving parts may require maintenance'],
    application:
      'Wardrobes, kitchen cabinets, drawers, dressing units, storage cabinets.',
  },
  // Baskets and Pullouts
  {
    parents: ['hardware'],
    subcategories: ['baskets and pullouts'],
    description:
      'Sliding baskets and pull-out storage systems designed for easy access and organized storage.',
    pros: [
      'Easy access to stored items',
      'Efficient space utilization',
      'Improves organization',
      'Available in various sizes and configurations',
    ],
    cons: [
      'Higher cost than fixed shelves',
      'Limited load capacity',
      'Runners may require maintenance',
      'Baskets may collect dust',
    ],
    application:
      'Kitchen base cabinets, pantry units, bottle pullouts, cutlery storage, utility cabinets.',
  },
  // Corner Unit Accessories
  {
    parents: ['hardware'],
    subcategories: ['corner unit accessories'],
    description:
      'Specialized rotating or pull-out mechanisms designed to make corner cabinet spaces more accessible and functional.',
    pros: [
      'Utilizes difficult-to-reach corners',
      'Improves accessibility',
      'Maximizes usable storage',
      'Convenient operation',
    ],
    cons: ['Premium pricing', 'Limited load capacity', 'May need maintenance'],
    application:
      'Kitchen corner cabinets, L-shaped kitchens, corner storage units',
  },
  // Rollup shutters
  {
    parents: ['hardware'],
    subcategories: ['rollup shutters', 'roll up shutters'],
    description:
      'Cabinet shutters made of interconnected slats that roll vertically or horizontally into a concealed housing.',
    pros: [
      'Space-saving',
      'No outward shutter swing',
      'Sleek appearance',
      'Convenient access',
      'Ideal for compact spaces',
    ],
    cons: [
      'Higher cost',
      'Limited colour and finish options',
      'Tracks may collect dust',
      'Mechanism may require maintenance',
    ],
    application:
      'Kitchen appliance garages, countertop cabinets, pantry units, compact storage cabinets.',
  },
  // Tandem Drawers
  {
    parents: ['hardware'],
    subcategories: ['tandem drawers'],
    description:
      'Premium drawer systems with concealed runners, designed for smooth sliding, soft closing and efficient storage.',
    pros: [
      'Smooth operation',
      'Soft-close options',
      'Good load capacity',
      'Premium appearance',
      'Easy access',
      'Organized storage',
    ],
    cons: [
      'Higher cost than conventional drawers',
      'Load capacity depends on model',
    ],
    application:
      'Kitchen drawers, cutlery units, utensil drawers, pantry drawers, wardrobe drawers',
  },
  // PVC
  {
    parents: ['ceiling'],
    subcategories: ['pvc'],
    description:
      'Lightweight ceiling panels made from PVC, available in various colours, patterns and finishes.',
    pros: [
      'Water-resistant',
      'Termite-resistant',
      'Easy to clean',
      'Low maintenance',
      'Quick installation',
      'Economical',
    ],
    cons: [
      'Less premium appearance',
      'Limited design flexibility',
      'Limited colours',
    ],
    application:
      'Bathrooms, kitchens, utility areas, balconies, moisture-prone areas.',
  },
  // Wooden Ceiling
  {
    parents: ['ceiling'],
    subcategories: ['wooden', 'wooden ceiling', 'wood'],
    description:
      'Decorative ceiling made using natural wood, veneer or wood-finish panels to create a warm, premium appearance.',
    pros: [
      'Elegant, premium look',
      'Adds warmth and texture',
      'Available in various finishes',
      'Suitable for contemporary designs',
    ],
    cons: ['Higher cost', 'Moisture and termite resistance depend on material'],
    application:
      'Living rooms, bedrooms, dining areas, foyers, feature ceilings.',
  },
  // Gypsum
  {
    parents: ['ceiling'],
    subcategories: ['gypsum'],
    description:
      'False ceiling made using gypsum boards fixed onto a metal framework, offering a smooth, seamless finish.',
    pros: [
      'Smooth finish',
      'Versatile designs',
      'Allows concealed lighting',
      'Suitable for modern interiors',
    ],
    cons: [
      'Susceptible to water damage',
      'May develop cracks at joints',
      'Requires painting and finishing',
      'Difficult to access concealed services without openings',
    ],
    application:
      'Living rooms, bedrooms, dining areas, kitchens, foyers, passageways.',
  },
];
