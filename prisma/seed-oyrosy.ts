import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Oyrosy products curated for MustHaveMods audience
// Commission Rate: 12%
// Source: docs/affiliates/Oyrosy_Product_Recommendations.md
const affiliateOffers = [
  // === DRESSES ===
  {
    name: 'Elegant Bohemian Style V-neck Tassel Floral Print Beige Satin Maxi Dress',
    description: 'Elegant, casual, floral print maxi dress perfect for bohemian style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/111_ef39127a-434f-420a-a600-e9f96bb83680.jpg?v=1742198128',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8932051452148&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Felegant-bohemian-style-v-neck-tassel-floral-print-beige-satin-maxi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'Boho Style',
    promoColor: '#d4a574',
  },
  {
    name: 'Western Retro White Cotton Linen Ruffled Sleeveless Midi Dress',
    description: 'Aesthetic, retro, elegant white cotton linen midi dress with ruffles.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/3af9ff6491b8d48cf206af2f94bbda9c.jpg?v=1768817961',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9281204453620&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-retro-white-cotton-linen-ruffled-sleeveless-midi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Classic Elegant Spaghetti Strap White Cotton Midi Dress',
    description: 'Elegant, casual white cotton midi dress with delicate lace details.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/0568bad98abb189a9a4b151e1c4df26f.jpg?v=1748078644',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9020869345524&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fclassic-elegant-spaghetti-strap-white-cotton-midi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Summer Vacation Navy Blue Square Collar Button White Knitted Midi Dress',
    description: 'Elegant, casual summer knitted midi dress in navy blue and white.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/6fa0a8f9037b028c800ca5b789fcc7a4.jpg?v=1748601386',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9027851911412&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fsummer-vacation-navy-blue-square-collar-button-white-knitted-midi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Retro Fashion Tube Top Short Front Long Back Ruffle Midi Dress',
    description: 'Vintage, retro casual midi dress with unique ruffle design.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_bf44fcf3-7b8b-4a07-81e3-3d304b387576.jpg?v=1736509457',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8937932587252&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fretro-fashion-tube-top-short-front-long-back-ruffle-midi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Western Vintage Brown Suede Fringe Sleeveless Mini Dress',
    description: 'Aesthetic, vintage, elegant brown suede mini dress with fringe details.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1744185662.7605.885fdd914baafa53e2cd89e473ef876b.jpg?v=1744281772',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8995592470772&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-vintage-brown-washed-cotton-tassel-sleeveless-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Retro Elegant High-End One-Shoulder Leopard Print Velvet Dress',
    description: 'Vintage, retro, elegant leopard print velvet dress.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_11357ccf-9ecb-46b6-aa7b-9f6988409035.jpg?v=1728901772',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8875896963316&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fretro-elegant-high-end-one-shoulder-leopard-print-velvet-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Western Vintage Blue Denim Sleeveless Shirt Tassel Rivet Mini Dress',
    description: 'Vintage, retro, casual blue denim mini dress with tassels and rivets.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/6_a3aff314-970b-44e0-a708-9688e3be2129.jpg?v=1751253529',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9025759412468&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-vintage-blue-denim-sleeveless-shirt-tassel-rivet-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Stylish Casual White Denim Zipper Ruffle Trim Mini Dress',
    description: 'Trendy, vintage, elegant white denim mini dress with ruffle trim.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1745307012.2633.06f9a6481d9b951b41a4eac40c091f6e.jpg?v=1745412665',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9003591860468&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fstylish-casual-white-denim-zipper-ruffle-trim-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Vacation Retro Rainbow Striped Chiffon Sleeveless Maxi Dress',
    description: 'Aesthetic, retro, casual rainbow striped chiffon maxi dress.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/8a5a6b6146fd661af0d3ef24d19272c0.jpg?v=1768643714',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9277357490420&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fvacation-retro-rainbow-striped-chiffon-sleeveless-maxi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Retro Bohemian Embroidered Suspender Dark Blue Maxi Dress',
    description: 'Vintage, retro, casual dark blue maxi dress with bohemian embroidery.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/d67004bec2668cda4df68c0df5c6c69f.png?v=1767169366',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9253264589044&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fretro-bohemian-embroidered-suspender-dark-blue-maxi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Comfortable And Fashionable White Cotton And Linen V-neck Button Sleeveless Mini Dress',
    description: 'Retro, elegant, casual white cotton and linen mini dress.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/8f396947146d1bd43f96ff580099a185.jpg?v=1747391712',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9016631951604&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fcomfortable-and-fashionable-white-cotton-and-linen-v-neck-button-sleeveless-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Fashion Retro Lapel Zipper Navy Blue Sleeveless Mini Dress',
    description: 'Vintage, retro, elegant navy blue mini dress with zipper detail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/08ab599cf84fbaf58a3954c6c6e21b8c.jpg?v=1746009962',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9007660630260&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffashion-retro-lapel-zipper-navy-blue-sleeveless-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Fashionable Retro Paisley Print Purple Chiffon Ruffle Sleeveless Mini Dress',
    description: 'Vintage, retro, elegant purple chiffon mini dress with paisley print.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/624002764807ec3e4daeade3d4ea5e52.jpg?v=1768643672',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9277355458804&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffashionable-retro-paisley-print-purple-chiffon-ruffle-sleeveless-mini-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Sporty Retro Striped Ribbed Pink Cotton Blend Sleeveless Midi Dress',
    description: 'Vintage, retro, casual pink striped midi dress with sporty style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1ea14667d10105edbe42dcf8d50b8fd8.jpg?v=1767782326',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9261745340660&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fsporty-retro-striped-ribbed-pink-cotton-blend-sleeveless-midi-dress&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },

  // === SKIRTS ===
  {
    name: 'Vintage Washed Raw Edge Tassel Light Blue Denim Culottes',
    description: 'Vintage, retro, casual light blue denim culottes with raw edge and tassels.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/76_2ff39d20-f608-479c-9e46-8a19f610a59d.jpg?v=1750647350',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9014595682548&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fvintage-washed-raw-edge-tassel-light-blue-denim-culottes&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Western Retro Red Faux Suede Slit Fringe Midi Skirt',
    description: 'Aesthetic, retro, casual red faux suede midi skirt with fringe.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/67e4a42e9c728b12bcfa7e939bba2f2f.jpg?v=1768897996',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9282634285300&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-retro-red-faux-suede-slit-fringe-midi-skirt&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Black Rose Print A-line Velvet Skirt',
    description: 'Casual, fashionable, romantic black velvet A-line skirt with rose print.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1_0002__49.jpg?v=1766743700',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9178252771572&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fblack-rose-print-a-line-velvet-skirt&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Elegant Stylish Long Sleeve Chiffon Blouse And Ruffled Skirt Set',
    description: 'Elegant, stylish matching set with chiffon blouse and ruffled skirt.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/2922a985dbb78ca1ad60c6e559234f19.png?v=1768907960',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9282831778036&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Felegant-stylish-long-sleeve-chiffon-blouse-and-ruffled-skirt-set&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },

  // === SHORTS ===
  {
    name: 'Western Retro White Denim Lace Trim Shorts',
    description: 'Trendy, retro summer white denim shorts with lace trim.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/a16b914d8cd3e418635f71e4af3de5e6.jpg?v=1748576788',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9027768156404&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-retro-white-denim-lace-trim-shorts&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Fashionable Sexy Pocket Embroidered Denim Shorts',
    description: 'Trendy, casual summer denim shorts with pocket embroidery.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/86949bcf54cfbf9cf29744a6ecafd024.jpg?v=1747195309',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9015550083316&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffashionable-sexy-pocket-embroidered-denim-shorts&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Casual Retro Sports Navy Blue Trimming Beige Knitted Sleeveless Shorts Set',
    description: 'Aesthetic, vintage, retro beige knitted shorts set with navy trim.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1744277040.1876.4bd4acd92f5b27256e4a5b7fb2072eac.jpg?v=1744365131',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8996427661556&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fcasual-retro-sports-navy-blue-trimming-beige-knitted-sleeveless-shorts-set&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Western Vintage Red Tassel Shorts',
    description: 'Vintage, casual summer red shorts with tassel detail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/3b8f417c7afb40ed485f8cd803f3c1c0.png?v=1751450522',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9023607111924&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fwestern-retro-red-tassel-shorts&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Breathable Fashion Front Zipper Short Sleeve Knit Shorts Jumpsuit',
    description: 'Casual, chic, fashionable knit shorts jumpsuit with front zipper.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1_D6RU2l.jpg?v=1739873806',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8964156817652&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fbreathable-fashion-front-zipper-short-sleeve-knit-shorts-jumpsuit&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },

  // === PANTS ===
  {
    name: 'Vintage Zipper Flare Jeans',
    description: 'Trendy, vintage, retro flare jeans with zipper detail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_05ab6204-7dbc-4f50-8ed5-c8d0a3480f85.jpg?v=1721207348',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8778007642356&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fvintage-zipper-flare-jeans&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Casual Loose Retro Solid Color Velvet Pocket Suit Pants',
    description: 'Vintage, retro, casual velvet suit pants in solid color.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_66458970-0f6e-4f7f-b31e-79f6da14f803.jpg?v=1725437360',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8844477759732&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fcasual-loose-retro-solid-color-velvet-pocket-suit-pants&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Trendy Retro Tassel Flared Jeans',
    description: 'Trendy, vintage, retro flared jeans with tassel detail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/ec976e58381aa32f66b7c8d51d8ef965.png?v=1754121622',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9100847055092&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ftrendy-retro-tassel-flared-jeans&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Casual Loose Vintage Velvet Leopard Print Pocket Elastic Waist Pants',
    description: 'Vintage, casual, fashionable velvet pants with leopard print.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_6a33a3f8-516a-49b4-91a2-21a97fc59022.jpg?v=1725949919',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8848773349620&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fcasual-loose-vintage-velvet-leopard-print-pocket-elastic-waist-pants&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Fashion Retro Houndstooth Pocket Straight Pants',
    description: 'Vintage, retro, casual straight pants with houndstooth pattern.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/png_583ac9b2-cb7d-447c-9857-df6647f9c659.jpg?v=1728454961',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8872274395380&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffashion-retro-houndstooth-pocket-straight-pants&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'fashion',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },

  // === JEWELRY ===
  {
    name: 'Fashion Beaded Heart Shape 18k Contrast Color Stainless Steel Necklace',
    description: 'Casual, chic beaded heart necklace in 18k contrast color.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/78fbe187ebfd0cdbafebb96341e6ec32.jpg?v=1747381074',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9016577917172&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffashion-beaded-heart-shape-18k-contrast-color-stainless-steel-necklace&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'French Retro Matte Metal Earrings',
    description: 'Vintage, retro, casual matte metal earrings with French style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_24bc4bb6-ca6f-407c-b424-77f74ae71acd.jpg?v=1733558350',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=46039472668916&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Ffrench-retro-matte-metal-earrings&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Vintage Distressed Bohemian Tassel Necklace Earrings Set',
    description: 'Aesthetic, vintage, casual bohemian jewelry set with tassels.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1_u5mbok.jpg?v=1741404194',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=46289077240052&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fvintage-distressed-bohemian-tassel-necklace-earrings-set&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Metallic Exaggerated Earrings',
    description: 'Vintage, retro, casual metallic statement earrings.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_93b39691-60ff-4cb1-b13b-47f5e558bef6.jpg?v=1733558350',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8916235256052&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fmetallic-exaggerated-earrings&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Retro Ethnic Style Turquoise Tassel Pendant Earrings',
    description: 'Retro, elegant, casual turquoise earrings with tassel pendants.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/f8f2e703b2c3505a5a9b8b8df235a6c2.jpg?v=1751876631',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=46646480601332&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fretro-ethnic-style-turquoise-tassel-pendant-earrings&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Bohemian Retro Ethnic Style Hand-woven Wooden Pendant Necklace',
    description: 'Vintage, retro hand-woven wooden pendant necklace with ethnic style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/1_waE78K.jpg?v=1741404185',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8975692169460&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fbohemian-retro-ethnic-style-hand-woven-wooden-pendant-necklace&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Simple Ethnic Retro Wooden Necklace',
    description: 'Retro, casual wooden necklace with simple ethnic style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/faa2e8f383cfac0946b10bf6df162632.jpg?v=1751876638',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=9074077696244&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fsimple-ethnic-retro-wooden-necklace&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
  {
    name: 'Luxury Fashion Pearl French Pendant Necklace',
    description: 'Aesthetic, fashionable pearl pendant necklace with French style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0628/2739/7364/files/jpg_6be03a88-4ee4-4408-9acb-55e29d17d074.jpg?v=1733206414',
    affiliateUrl: 'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=8912968417524&u=https%3A%2F%2Foyrosy.com%2Fproducts%2Fluxury-fashion-pearl-french-pendant-necklace&intsrc=APIG_22361',
    partner: 'Oyrosy',
    partnerLogo: null,
    category: 'jewelry',
    priority: 95,
    promoText: 'New Arrival',
    promoColor: '#d4a574',
  },
];

async function main() {
  console.log('👗 Seeding Oyrosy affiliate offers for MustHaveMods...\n');

  // First, update all existing non-Oyrosy affiliates to priority 90
  console.log('📉 Updating existing affiliates to priority 90...');
  const updateResult = await prisma.affiliateOffer.updateMany({
    where: {
      partner: {
        not: 'Oyrosy',
      },
    },
    data: {
      priority: 90,
    },
  });
  console.log(`   Updated ${updateResult.count} existing offers to priority 90\n`);

  // Add Oyrosy products as disabled
  let created = 0;
  let skipped = 0;

  for (const offer of affiliateOffers) {
    const existing = await prisma.affiliateOffer.findFirst({
      where: { affiliateUrl: offer.affiliateUrl },
    });

    if (existing) {
      console.log(`⏭️  Skipping (exists): ${offer.name.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    await prisma.affiliateOffer.create({
      data: {
        ...offer,
        isActive: false, // Disabled by default
        impressions: 0,
        clicks: 0,
      },
    });
    console.log(`✅ Created (disabled): ${offer.name.substring(0, 50)}...`);
    created++;
  }

  const totalOyrosy = await prisma.affiliateOffer.count({
    where: { partner: 'Oyrosy' },
  });
  const totalAll = await prisma.affiliateOffer.count();

  console.log(`\n🎉 Done!`);
  console.log(`   Created: ${created} new Oyrosy offers`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  console.log(`   Total Oyrosy offers: ${totalOyrosy}`);
  console.log(`   Total all offers: ${totalAll}`);
}

main()
  .catch((e) => {
    console.error('Error seeding Oyrosy affiliates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
