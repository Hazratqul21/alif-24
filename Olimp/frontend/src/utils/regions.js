/**
 * O'zbekiston viloyatlari va tumanlari
 * Olimpiada ro'yxatdan o'tish uchun
 */
export const REGIONS = {
  "Qoraqalpog'iston Respublikasi": [
    "Amudaryo","Beruniy","Chimboy","Ellikqal'a","Kegeyli","Mo'ynoq",
    "Nukus","Qanlikol","Qo'ng'irot","Qoraozak","Shumanay",
    "Taxtakopir","To'rtko'l","Xo'jayli","Taxiatosh","Bo'zatov"
  ],
  "Andijon viloyati": [
    "Andijon","Asaka","Baliqchi","Bo'ston","Buloqboshi","Izboskan",
    "Jalaquduq","Xo'jaobod","Qo'rg'ontepa","Marhamat","Oltinko'l",
    "Paxtaobod","Shahrixon","Ulug'nor"
  ],
  "Buxoro viloyati": [
    "Olot","Buxoro","G'ijduvon","Jondor","Kogon","Qorako'l",
    "Qorovulbozor","Peshku","Romitan","Shofirkon","Vobkent"
  ],
  "Farg'ona viloyati": [
    "Oltiariq","Bag'dod","Beshariq","Buvayda","Dang'ara","Farg'ona",
    "Furqat","Qo'shtepa","Quva","Rishton","So'x","Toshloq",
    "Uchko'prik","O'zbekiston","Yozyovon"
  ],
  "Jizzax viloyati": [
    "Arnasoy","Baxmal","Do'stlik","Forish","G'allaorol",
    "Sharof Rashidov","Mirzacho'l","Paxtakor","Yangiobod",
    "Zomin","Zafarobod","Zarbdor"
  ],
  "Xorazm viloyati": [
    "Bog'ot","Gurlan","Xonqa","Hazorasp","Xiva","Qo'shko'pir",
    "Shovot","Urganch","Yangiariq","Yangibozor","Tuproqqal'a"
  ],
  "Namangan viloyati": [
    "Chortoq","Chust","Kosonsoy","Mingbuloq","Namangan","Norin",
    "Pop","To'raqo'rg'on","Uchqo'rg'on","Uychi","Yangiqo'rg'on"
  ],
  "Navoiy viloyati": [
    "Konimex","Karmana","Qiziltepa","Xatirchi","Navbahor",
    "Nurota","Tomdi","Uchquduq"
  ],
  "Qashqadaryo viloyati": [
    "Chiroqchi","Dehqonobod","G'uzor","Qamashi","Qarshi","Koson",
    "Kasbi","Kitob","Mirishkor","Muborak","Nishon",
    "Shahrisabz","Yakkabog'","Ko'kdala"
  ],
  "Samarqand viloyati": [
    "Bulung'ur","Ishtixon","Jomboy","Kattaqo'rg'on","Qo'shrabot",
    "Narpay","Nurobod","Oqdaryo","Paxtachi","Payariq",
    "Pastdarg'om","Samarqand","Toyloq","Urgut"
  ],
  "Sirdaryo viloyati": [
    "Oqoltin","Boyovut","Guliston","Xovos","Mirzaobod",
    "Sayxunobod","Sardoba","Sirdaryo"
  ],
  "Surxondaryo viloyati": [
    "Angor","Boysun","Denov","Jarqo'rg'on","Qiziriq","Qumqo'rg'on",
    "Muzrabot","Oltinsoy","Sariosiyo","Sherobod","Sho'rchi",
    "Termiz","Uzun","Bandixon"
  ],
  "Toshkent viloyati": [
    "Bekobod","Bo'stonliq","Bo'ka","Chinoz","Qibray","Ohangaron",
    "Oqqo'rg'on","Parkent","Piskent","Quyi Chirchiq",
    "O'rta Chirchiq","Yangiyol","Yuqori Chirchiq","Zangiota","Toshkent"
  ],
  "Toshkent shahri": [
    "Bektemir","Chilonzor","Yashnobod","Mirobod","Mirzo Ulug'bek",
    "Sergeli","Shayxontohur","Olmazor","Uchtepa",
    "Yakkasaroy","Yunusobod","Yangihayot"
  ]
};

export const REGION_NAMES = Object.keys(REGIONS);

export function getDistricts(region) {
  return REGIONS[region] || [];
}
