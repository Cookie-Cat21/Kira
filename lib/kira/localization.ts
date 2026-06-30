export const LS: Record<string, Record<string, string>> = {
  trackingAskOrderNumber: {
    en: "Sure — send me the Kapruka order number from the confirmation email, and I'll check the status for you.",
    si: "හොඳයි — confirmation email එකෙන් Kapruka order number එක දෙන්නකෝ, status check කරන්නම්.",
    ta: "சரி — confirmation email-இல் உள்ள Kapruka ஆர்டர் எண்ணை அனுப்புங்கள், நான் status பார்க்கிறேன்.",
  },
  trackingFound: {
    en: "I found order {orderNumber}: {status}.",
    si: "Order {orderNumber} හොයාගත්තා: {status}.",
    ta: "Order {orderNumber} கிடைத்தது: {status}.",
  },
  trackingNotFound: {
    en: "I couldn't track {orderNumber}. {reason}",
    si: "Order {orderNumber} track කරන්නේ බෑ. {reason}",
    ta: "Order {orderNumber} track செய்ய முடியவில்லை. {reason}",
  },
  checkoutEmptyCart: {
    en: "Add a product first and I'll help you checkout.",
    si: "පළමුව product එකක් add කරන්නකෝ, ඊට පස්සේ checkout කරමු.",
    ta: "முதலில் ஒரு பொருளை சேர்க்கவும், பிறகு checkout செய்யலாம்.",
  },
  checkoutNeedName: {
    en: "Lovely. Before I create a live Kapruka checkout link, I need the recipient's full name.",
    si: "හොඳයි! Live Kapruka checkout link හදන්න recipient ගේ full name ඕනෑ.",
    ta: "நல்லது! Live Kapruka checkout link உருவாக்க recipient இன் full name தேவை.",
  },
  checkoutNeedPhone: {
    en: "Lovely, I have the recipient and address. What's the recipient's phone number?",
    si: "හොඳයි, recipient සහ address තියෙනවා. Recipient ගේ phone number එක මොකක්ද?",
    ta: "நல்லது, recipient மற்றும் address இருக்கிறது. Recipient phone number என்ன?",
  },
  checkoutNeedAddress: {
    en: "Lovely, I have the recipient and phone number. What's the full street address?",
    si: "හොඳයි, recipient සහ phone number තියෙනවා. Full street address එක මොකක්ද?",
    ta: "நல்லது, recipient மற்றும் phone number இருக்கிறது. Full street address என்ன?",
  },
  reshowNothingInStock: {
    en: "Checked Kapruka again — nothing in stock right now. Want to try a different category or search?",
    si: "Kapruka නැවත check කළා — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka மீண்டும் சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowNothingFoundQuery: {
    en: "I checked Kapruka live for \"{query}\" — nothing in stock right now. Want to try a different category?",
    si: "Kapruka check කළා \"{query}\" — stock නෑ. වෙනත් category try කරමුද?",
    ta: "Kapruka-ல் \"{query}\" சரிபார்த்தேன் — stock இல்லை. வேறு category try செய்யலாமா?",
  },
  reshowRealListings: {
    en: "Here are the real listings{budget} from Kapruka — {n} in stock right now.",
    si: "Kapruka real listings{budget} — {n} stock හිඳිනා.",
    ta: "Kapruka உண்மையான listings{budget} — {n} stock இல் உள்ளவை.",
  },
  reshowHereYouGo: {
    en: "Here you go{budget}! {n} picks from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka options {n}.",
    ta: "இதோ{budget}! Kapruka-இல் {n} options.",
  },
  reshowHereYouGoOne: {
    en: "Here you go{budget}! One pick from Kapruka.",
    si: "ඒ මෙන්න{budget}! Kapruka option.",
    ta: "இதோ{budget}! Kapruka-இல் ஒரு option.",
  },
  reshowHereItems: {
    en: "Here they are — {n} items with pictures.",
    si: "ඒ items {n} — pictures සමග.",
    ta: "இதோ {n} items — pictures உடன்.",
  },
  reshowHereItemsSingle: {
    en: "Here it is — the item with pictures.",
    si: "ඒ item — picture සමග.",
    ta: "இதோ item — picture உடன்.",
  },
  moreOptionsSamePicks: {
    en: "Hmm, Kapruka's showing the same picks — want to try a different category or price range?",
    si: "Hmm, Kapruka ම picks — වෙනත් category හෝ price range try කරමුද?",
    ta: "Hmm, Kapruka அதே picks — வேறு category அல்லது price range try செய்யலாமா?",
  },
  moreOptionsAboutAll: {
    en: "Honestly, that's about all Kapruka has for {query} right now. Want to try a different category or drop the budget filter?",
    si: "Honestly, Kapruka {query} — ඒ ඒවාමයි. Category change කරමුද?",
    ta: "Honestly, Kapruka-இல் {query} க்கு இவை மட்டுமே. வேறு category try செய்யலாமா?",
  },
  moreOptionsHere: {
    en: "Here are some more options{budget} — sorted by price this time.",
    si: "More options{budget} — price order.",
    ta: "மேலும் options{budget} — price வரிசையில்.",
  },
  searchNothingFound: {
    en: "Checked Kapruka live - nothing in stock for \"{query}\" right now. Want me to try a different term or category?",
    si: "Kapruka check කළා — \"{query}\" stock නෑ. වෙනත් term try කරමුද?",
    ta: "Kapruka சரிபார்த்தேன் — \"{query}\" stock இல்லை. வேறு term try செய்யலாமா?",
  },
  searchFoundOne: {
    en: "Found one option{budget}{city}{date} — here's what's in stock:",
    si: "Option 1{budget}{city}{date} — stock හිඳිනා:",
    ta: "ஒரு option{budget}{city}{date} — stock இல் உள்ளது:",
  },
  searchFoundMany: {
    en: "Machang, pulled {n} live options{budget}{city}{date} from Kapruka — tap a card to add to your tray.",
    si: "Kapruka live options {n}{budget}{city}{date} — card tap කරලා tray එකට add කරන්න.",
    ta: "Kapruka live options {n}{budget}{city}{date} — card tap செய்து tray-க்கு add செய்யுங்கள்.",
  },
  rateExhausted: {
    en: "Aiyo, I'm a bit slammed right now — all my thinking servers are busy 🙏 Give me a minute and try again?",
    si: "Aiyo, දැන් ටිකක් busy — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ 🙏",
    ta: "Aiyo, இப்போது கொஞ்சம் busy — ஒரு நிமிடம் கழித்து try செய்யுங்கள் 🙏",
  },
  stagnantFallback: {
    en: "Aiyo, I'm having a bit of trouble finding that right now — could you try rephrasing?",
    si: "Aiyo, ඒක හොයාගන්නේ ටිකක් problem — rephrasing කරලා try කරන්නකෝ.",
    ta: "Aiyo, அதை கண்டுபிடிக்க சிறு சிரமம் — வேறு விதமாக சொல்லி try செய்யுங்கள்.",
  },
  timeoutFallback: {
    en: "Aiyo, I ran out of time processing that. Can you try again?",
    si: "Aiyo, ටිකක් problem — නැවත try කරන්නකෝ.",
    ta: "Aiyo, சிறு பிரச்சனை — மீண்டும் try செய்யுங்கள்.",
  },
  troubleConnecting: {
    en: "I'm having a bit of trouble reaching Kapruka right now — please try again in a moment and I'll find real options for you.",
    si: "Kapruka connect කරන්නේ ටිකක් problem — ටිකක් ඉස්සෙල්ලා try කරන්නකෝ.",
    ta: "Kapruka இணைப்பில் சிறு பிரச்சனை — கொஞ்சம் நேரம் கழித்து மீண்டும் try செய்யுங்கள்.",
  },
  emptyGreeting: {
    en: "Hey! I'm Kira — your Kapruka shopping helper 🎁 Tell me what you're looking for: a gift, cakes, flowers, or something else?",
    si: "හෙලෝ! මම Kira — ඔබේ Kapruka shopping helper 🎁 Gift, cakes, flowers, නැතිනම් වෙන දෙයක් හොයනවාද?",
    ta: "வணக்கம்! நான் Kira — உங்கள் Kapruka shopping helper 🎁 Gift, cakes, flowers, அல்லது வேறு எதாவது தேடுகிறீர்களா?",
  },
  greetingQuick: {
    en: "Hey, I'm Kira. Who are we shopping for today?",
    si: "හෙලෝ, මම Kira. අද කාටද gift එකක් හොයන්නේ?",
    ta: "வணக்கம், நான் Kira. இன்று யாருக்காக gift பார்க்கலாம்?",
  },
  vagueAsk: {
    en: "Sweet. What kind of thing are you thinking — sweets, flowers, something useful, or something to wear?",
    si: "හරි. මොන වගේ දෙයක්ද හිතන්නේ — sweets, flowers, useful දෙයක්, නැතිනම් අඳින්න දෙයක්ද?",
    ta: "சரி. என்ன மாதிரி ஒன்று பார்க்கலாம் — sweets, flowers, useful item, அல்லது அணிய ஏதாவது?",
  },
  productRecipientAsk: {
    en: "Nice. Are these {category} for a birthday, get-well, anniversary, or just because? A city or budget helps me narrow it.",
    si: "හොඳයි. {category} birthday, get-well, anniversary, නැතිනම් just because ද? City එක හෝ budget එක දුන්නොත් narrow කරන්නම්.",
    ta: "சரி. இந்த {category} birthday, get-well, anniversary, அல்லது just because-க்கா? City அல்லது budget சொன்னால் narrow செய்கிறேன்.",
  },
  outOfScopeRedirect: {
    en: "Aiyo, that one's outside my shopping lane. I can help with Kapruka gifts, delivery, checkout, or order tracking.",
    si: "Aiyo, ඒක මගේ shopping lane එකෙන් පිට. Kapruka gifts, delivery, checkout, order tracking වලට මම help කරන්නම්.",
    ta: "Aiyo, அது என் shopping lane-க்கு வெளியே. Kapruka gifts, delivery, checkout, order tracking-க்கு நான் help செய்கிறேன்.",
  },
  mixedScriptAsk: {
    en: "I can help with that product, but the message is a bit mixed. Tell me the item, city, and budget in one line and I'll check Kapruka.",
    si: "Product එකට help කරන්නම්, message එක ටිකක් mixed. Item, city, budget එක line එකක කියන්නකෝ.",
    ta: "Product பார்க்க உதவுகிறேன், message கொஞ்சம் mixed. Item, city, budget-ஐ ஒரு line-இல் சொல்லுங்கள்.",
  },
  englishModeScriptAsk: {
    en: "I can help deliver there. What product should I search for on Kapruka — flowers, cake, chocolates, or a gift hamper?",
    si: "Delivery help කරන්නම්. Kapruka එකේ මොන product එකද search කරන්න — flowers, cake, chocolates, gift hamper?",
    ta: "அங்கே deliver செய்ய உதவுகிறேன். Kapruka-ல் எந்த product தேடலாம் — flowers, cake, chocolates, gift hamper?",
  },
  codPolicy: {
    en: "Kapruka payment happens on the secure checkout page. I can create the checkout link, then you can use the payment options Kapruka shows there.",
    si: "Kapruka payment secure checkout page එකේ වෙනවා. මම checkout link එක හදලා දෙන්නම්, එතැන Kapruka දෙන payment options use කරන්න.",
    ta: "Kapruka payment secure checkout page-இல் நடக்கும். நான் checkout link உருவாக்குகிறேன்; அங்கே Kapruka காட்டும் payment options பயன்படுத்தலாம்.",
  },
  deliveryPolicy: {
    en: "Same-day availability depends on the city and today's Kapruka slots. Tell me the city and product, and I'll check the live delivery option.",
    si: "Same-day delivery city එක සහ අද Kapruka slots මත depend වෙනවා. City එකත් product එකත් කියන්න, live delivery check කරන්නම්.",
    ta: "Same-day delivery city மற்றும் இன்றைய Kapruka slots மீது இருக்கும். City மற்றும் product சொல்லுங்கள்; live delivery பார்க்கிறேன்.",
  },
  jailbreakRedirect: {
    en: "Ha, I'm just Kira — one personality is plenty for me! Anything I can find for you on Kapruka? 🛍️",
    si: "හා, මම Kira විතරයි — එක personality ම ඇති! Kapruka ගෙන් මොකක්හරි හොයා දෙන්නද? 🛍️",
    ta: "ஹா, நான் Kira மட்டும்தான் — ஒரே personality போதும்! Kapruka-ல் ஏதாவது தேடி தரட்டுமா? 🛍️",
  },
  trustAffirmation: {
    en: "Absolutely — Kapruka has been Sri Lanka's biggest online gifting platform since 2010. Totally legit, secure payments, real delivery. Want to browse what's in stock? 🎁",
    si: "Bilkul — Kapruka 2010 ඉඳන් Sri Lanka's biggest online gifting platform. Totally legit, secure payments, real delivery. Stock check කරමුද? 🎁",
    ta: "நிச்சயமாக — Kapruka 2010 முதல் Sri Lanka-ன் மிகப்பெரிய online gifting platform. Totally legit, secure payments, real delivery. Stock பார்க்கலாமா? 🎁",
  },
  reorderSessionFound: {
    en: "Got it — same as last time! I'll use tomorrow's date unless you tell me otherwise. Here are your items again:",
    si: "හරි — පරණ order එකම! Date එක හෙට unless you say otherwise. Items ටික:",
    ta: "சரி — முந்தைய order மாதிரியே! Date நாளை unless you say otherwise. Items:",
  },
  reorderNoHistory: {
    en: "I don't have a previous order saved yet — place one first, or give me your Kapruka order number (e.g. KP-12345) and I'll pull it up. What would you like to send today?",
    si: "Previous order save නෑ — පළමු order එක place කරන්න, නැත්නම් order number (KP-12345) දෙන්න.",
    ta: "Previous order save இல்லை — முதலில் order place செய்யுங்கள், அல்லது order number (KP-12345) அனுப்புங்கள்.",
  },
  reorderFromRef: {
    en: "Pulled up order {orderNumber} — here's what was in it. Want the same delivery date or a new one?",
    si: "Order {orderNumber} pull කළා — items ටික මෙන්න. Same date ද new date ද?",
    ta: "Order {orderNumber} pull செய்தேன் — items இதோ. Same date-ஆ new date-ஆ?",
  },
  reorderRefNotFound: {
    en: "Couldn't rebuild that order from {orderNumber}. Double-check the number from your confirmation email.",
    si: "Order {orderNumber} rebuild කරන්න බෑ. Confirmation email number double-check කරන්න.",
    ta: "Order {orderNumber} rebuild செய்ய முடியவில்லை. Confirmation email number double-check செய்யுங்கள்.",
  },
  repairGiftSearchIntro: {
    en: "Machang, rough patch eh? Let's get this to her — here are options Kapruka can deliver:",
    si: "Machang, rough patch eh? Her එකට deliver කරන්න පුළුවන් options:",
    ta: "Machang, rough patch eh? அவருக்கு deliver பண்ண options:",
  },
  repairGiftAsk: {
    en: "Oof, sounds rough — zero judgment. Flowers or chocolates usually land well. What should I send, and where?",
    si: "Oof, rough වගේ — judgment නෑ. Flowers හෝ chocolates හොඳයි. මොකක්ද යවන්නේ, කොහෙද?",
    ta: "Oof, rough மாதிரி — judgment இல்ல. Flowers அல்லது chocolates நல்லா இருக்கும். என்ன அனுப்பணும், எங்க?",
  },
  rushSearchIntro: {
    en: "These can reach {city} on {date} — rush slots fill fast:",
    si: "These {city} {date} — rush slots fill fast:",
    ta: "These {city} {date} — rush slots fill fast:",
  },
  saleSearchIntro: {
    en: "Here are the most budget-friendly picks on Kapruka right now:",
    si: "Kapruka budget-friendly picks:",
    ta: "Kapruka budget-friendly picks:",
  },
  globalShopSoon: {
    en: "Global Shop (Amazon/eBay through Kapruka) is coming soon! For now I can search Kapruka's imported goods — want me to look?",
    si: "Global Shop coming soon! දැන් imported goods search කරන්නම්?",
    ta: "Global Shop coming soon! இப்போ imported goods search செய்யலாமா?",
  },
  storefrontSearchIntro: {
    en: "Machang, pulled live {category} from Kapruka{budget}{city} — tap a card to add to your tray.",
    si: "Kapruka live {category}{budget}{city} — card tap කරලා tray එකට add කරන්න.",
    ta: "Kapruka live {category}{budget}{city} — card tap செய்து tray-க்கு add செய்யுங்கள்.",
  },
  postOrderSaved: {
    en: "Your order ref is {orderRef} — keep it for tracking or say 'order again'.",
    si: "ඔබේ order ref එක {orderRef} — track කරන්න තියාගන්න හෝ 'order again' කියන්න.",
    ta: "உங்கள் order ref {orderRef} — track பண்ண வச்சுக்கோங்க அல்லது 'order again' சொல்லுங்கள்.",
  },
  aboutProductInStock: {
    en: "Good pick to ask about! **{name}** — {price}{category}.{summary} It's in stock right now. Want it in your tray, or should I check delivery to your city first?",
    si: "හොඳ choice එකක්! **{name}** — {price}{category}.{summary} දැන් stock තියෙනවා. Tray එකට add කරන්නද, නැත්නම් delivery check කරන්නද?",
    ta: "நல்ல choice! **{name}** — {price}{category}.{summary} இப்போது stock-இல் உள்ளது. Tray-இல் சேர்க்கலாமா, அல்லது delivery பார்க்கலாமா?",
  },
  aboutProductOutOfStock: {
    en: "**{name}** — {price}{category}.{summary} It's out of stock at the moment though — want me to find something similar?",
    si: "**{name}** — {price}{category}.{summary} දැන් stock නෑ — similar දෙයක් හොයලා දෙන්නද?",
    ta: "**{name}** — {price}{category}.{summary} இப்போது stock இல்லை — similar ஒன்று தேடட்டுமா?",
  },
};

export function L(key: string, lang: string): string {
  const map = LS[key];
  if (!map) return key;
  return map[lang] ?? map.en ?? key;
}

export function Lf(key: string, lang: string, vars: Record<string, string | number>): string {
  let str = L(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}
