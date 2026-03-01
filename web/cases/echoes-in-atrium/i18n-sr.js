(function() {
  const keys = {
    // ── Title card ──
    "intro.subtitle": "Istraga ubistva",

    // ── Case briefing (case board) ──
    "intro.briefing_label": "Brifing o Slu\u010daju",
    "intro.victim": "<strong>\u017drtva:</strong> D\u017eulijan Merser, harizamti\u010dan preduzetnik, ve\u0107inski vlasnik hotela Lyric Atrium i direktor startapa Panopticon za nadzor \u2014 prona\u0111en mrtav u opservatoriji na krovu hotela.",
    "intro.time_of_death": "<strong>Procenjeno vreme smrti:</strong> Izme\u0111u 23:15 i 23:30 (tokom nestanka struje). \u017drtva je ubijena anti\u010dkim postolem teleskopa.",
    "intro.body_discovered": "<strong>Telo prona\u0111eno:</strong> Pribli\u017eno u 23:44, od strane direktora obezbe\u0111enja Matijasa Holta u opservatoriji na krovu, tokom ekskluzivne gala ve\u010deri u istorijskom art deko hotelu iz 1920-ih.",
    "intro.circumstances": "<strong>Okolnosti:</strong> Nestanak struje je trajao od 23:15 do 23:30 \u2014 neko je ru\u010dno iskop\u010dao osigura\u010d. Olujno vreme je usporilo dolazak policije, daju\u0107i osumnji\u010denima vremena da usklade alibije.",
    "intro.starting_evidence": "<strong>Po\u010detni dokazi:</strong> Oru\u017eje ubistva \u2014 anti\u010dko postolje teleskopa \u2014 prona\u0111eno je razbijeno pored tela. Forenzi\u010dari su prona\u0161li <em>spaljen fragment bele\u017enice</em> u podrumskom spalioniku; sadr\u017ei delimi\u010dnu listu imena koja izgleda kao lista za ucenu ili pretnje. Ime <em>\u2018Matt\u2019</em> je \u010ditljivo. Hotelsko obezbe\u0111enje je tako\u0111e obezbedilo <em>evidenciju pristupnih kartica</em> za krov. Koristite ovo da pritisnete osumnji\u010dene tokom ispitivanja.",
    "intro.your_role": "<strong>Va\u0161a uloga:</strong> Vi ste glavni detektiv. Ispitajte osam osumnji\u010denih \u2014 svaki sa sopstvenim tajnama, motivima i ograni\u010denjima znanja. Otkrijte kontradikcije, prikupite dokaze i identifikujte ubicu.",
    "intro.your_partner": "<strong>Va\u0161 partner:</strong> Detektiv Lila \u010cen \u0107e vam pomo\u0107i sa takti\u010dkim savetima i pravnim smernicama. Po\u010dnite sa njom za pregled slu\u010daja.",
    "intro.tip": "<strong>Savet:</strong> Likovi \u0107e pa\u017eeljivo \u010duvati svoje tajne. Predstavite dokaze i izgradite pritisak da probijete njihovu odbranu. Obratite pa\u017enju na kontradikcije izme\u0111u svedo\u010denja.",

    // ── NPC roles ──
    "role.lila-chen": "Va\u0161 Partner",
    "role.amelia-reyes": "Glavni In\u017eenjer",
    "role.noah-sterling": "Koosni\u0160a\u010d",
    "role.celeste-ward": "D\u017eez Peva\u010dica",
    "role.matthias-holt": "Direktor Obezbe\u0111enja",
    "role.mira-kline": "Etik Konsultant",
    "role.eddie-voss": "Mladi in\u017eenjer",
    "role.priya-shah": "Novinarka",
    "role.matthew-vale": "Menad\u017eer Scene",

    // ── Evidence panel ──
    "evidence.tab": "Dokazi i otkri\u0107a",
    "evidence.dossiers_tab": "Dosijei",
    "evidence.timeline_tab": "Hronologija",
    "evidence.empty": "Nema prikupljenih dokaza. Ispitajte osumnji\u010dene da biste otkrili tragove.",
    "evidence.timeline_empty": "Doga\u0111aji \u0107e se pojaviti ovde dok sklapate sliku o tome \u0161ta se desilo.",
    "evidence.mentioned_by": "Pomenuo/la {name} tokom ispitivanja.",
    "evidence.mentioned_by_partner": "Podeljeno od {name} tokom brifinga o slu\u010daju.",
    "evidence.crime_scene": "Prona\u0111eno na mestu zlo\u010dina od strane forenzi\u010dara.",
    "evidence.burned-notebook_desc": "Prona\u0111eno u podrumskom spalioniku. Sadr\u017ei delimi\u010dnu listu imena \u2014 izgleda kao lista za ucenu ili pretnje. Ime \u2018Matt\u2019 je \u010ditljivo.",
    "evidence.security_systems": "Dobijeno iz hotelskih sigurnosnih sistema.",

    // ── Evidence labels ──
    "evidence.burned-notebook_label": "Spaljen Fragment Bele\u017enice",
    "evidence.keycard-logs_label": "Evidencija Pristupnih Kartica",
    "evidence.key-trail_label": "Trag Klju\u010da za Odr\u017eavanje",
    "evidence.power-outage_label": "Namerna Sabota\u017ea Struje",
    "evidence.encrypted-schedule_label": "\u0160ifrovani Raspored",
    "evidence.financial-misconduct_label": "Finansijske Nepravilnosti",
    "evidence.surveillance_label": "Praznine u CCTV Snimcima",
    "evidence.secret-affair_label": "Tajna Veza",
    "evidence.audio-recording_label": "Audio Snimak",
    "evidence.nda-ip_label": "NDA / Kra\u0111a Intelektualne Svojine",
    "evidence.blackmail_label": "Dokazi o Uceni",
    "evidence.data-sales_label": "Nelegalna Prodaja Podataka",
    "evidence.plagiarism_label": "Plagirano Istra\u017eivanje",
    "evidence.lockpick-marks_label": "Tragovi Obijanja",
    "evidence.hotel-sale_label": "Plan Prodaje Hotela",
    "evidence.stage-timing_label": "Praznine u Rasporedu Scene",

    // ── Evidence groups ──
    "evidence.group_physical": "Fizi\u010dki Dokazi",
    "evidence.group_documentary": "Dokumenti i Zapisi",
    "evidence.group_testimony": "Svedo\u010denja",
    "evidence.group_access": "Pristup i Prilika",
    "evidence.group_motive": "Motiv",

    // ── Discovery texts ──
    "discovery.amelia-key-loan": "Amelija priznaje da je pozajmila klju\u010d za odr\u017eavanje Ediju Vosu ranije te ve\u010deri da bi preuzeo zaboravljeni alat.",
    "discovery.amelia-breaker": "Amelija je namerno iskop\u010dala osigura\u010d da pretra\u017ei Merserov apartman u potrazi za dokazima da planira prodaju hotela.",
    "discovery.amelia-hotel-sale": "Amelija je saznala da Merser namerava da proda hotel Lyric Atrium investitoru, \u0161to bi ugrozilo nasle\u0111e hotela.",
    "discovery.amelia-lockpick": "Tragovi obijanja na vratima prostorije za odr\u017eavanje ukazuju da je neko bez klju\u010da nasilno u\u0161ao \u2014 Amelijin klju\u010d je ve\u0107 bio kod Edija.",
    "discovery.noah-embezzlement": "Finansijski izve\u0161taji otkrivaju da je Noa Sterling pronevero sredstva kompanije da pokrije kockarske dugove. Merser je to otkrio.",
    "discovery.noah-board-vote": "Merserov \u0161ifrovani raspored otkriva da je planirao iznenadno glasanje uprave da ukloni Nou iz kompanije.",
    "discovery.noah-key-access": "Trag klju\u010da za odr\u017eavanje vodi od Amelije do Edija pa do Noe \u2014 daju\u0107i Noi pristup krovu tokom nestanka struje.",
    "discovery.noah-cctv-gap": "Praznine u CCTV snimcima i svedo\u010denja o\u010devidaca postavljaju Nou blizu teretnog lifta i hodnika za odr\u017eavanje tokom nestanka struje.",
    "discovery.celeste-affair": "Selest i D\u017eulijan Merser su imali tajnu romansu. On joj je obe\u0107ao da \u0107e je osloboditi nepovoljnog menad\u017eerskog ugovora.",
    "discovery.celeste-recordings": "Selest poseduje audio snimke na kojima Merser priznaje kori\u0161\u0107enje nelegalnih taknika nadzora u Panopticonu.",
    "discovery.celeste-rooftop-witness": "Selest je videla figuru \u2014 prepoznatljivu kao Noa Sterling \u2014 kako silazi niz stepeni\u0161te atrijuma tokom nestanka struje.",
    "discovery.matthias-blackmail": "Merser je ucenjivao Matijasa \u2014 njegovo ime se nalazi na listi pretnji iz spaljenog fragmenta bele\u017enice.",
    "discovery.matthias-data-sales": "Matijas vodi sporedni posao prodaje anonimizovanih podataka gostiju iz hotelskih sistema.",
    "discovery.matthias-saw-noah": "Matijas je video Nou Sterlinga kako se \u0161unja ka hodnicima za odr\u017eavanje neposredno pre nestanka struje.",
    "discovery.matthias-noah-financial": "Matijas otkriva da je tokom konfrontacije sa Merserom, Merser pomenuo da je Noa skidao novac sa ra\u010duna kompanije i da \u0107e se uprava time pozabaviti.",
    "discovery.mira-plagiarism": "Merser je plagirao istra\u017eivanje Dr Klajn za eti\u010dki okvir Panopticona. Ona je planirala da ga javno razotkrije.",
    "discovery.mira-meeting": "Mira je zakazala privatni sastanak sa Merserom u 23:30 da zahteva javno priznanje. Merser se nije pojavio \u2014 ve\u0107 je bio mrtav.",
    "discovery.eddie-key-loan": "Edi Vos je pozajmio Amelijin klju\u010d za odr\u017eavanje da preuzme alat i zaboravio da ga odmah vrati.",
    "discovery.eddie-gave-noah-key": "Noa Sterling je pritiskao Edija da mu preda klju\u010d za odr\u017eavanje na VIP baru ranije te ve\u010deri, obe\u0107avaju\u0107i usluge.",
    "discovery.priya-saw-noah": "Prija je videla Nou Sterlinga blizu teretnog lifta neposredno pre nego \u0161to je nestalo struje.",
    "discovery.priya-holt-argument": "Prija je snimila delove sva\u0111e izme\u0111u Mersera i Matijasa Holta ranije te ve\u010deri.",
    "discovery.priya-board-vote": "Prija otkriva da joj je korporativni izvor rekao da uprava Panopticona planira hitno glasanje za uklanjanje koosni\u010da\u010da \u2014 verovatno Noe Sterlinga.",
    "discovery.priya-mira-tip": "Dr Mira Klajn je obavestila Priju o Merserovim eti\u010dkim prekr\u0161ajima i organizovala njeno prisustvo na gali.",
    "discovery.matthew-noah-absence": "Metjuov raspored signala pokazuje da se Noa Sterling udaljio na pribli\u017eno pet minuta tokom nestanka struje.",
    "discovery.matthew-celeste-break": "Metju je primetio da je Selest Vord imala nezakazanu pauzu tokom nestanka struje, \u0161to ukazuje da je ne\u0161to videla.",

    // ── Dossier labels ──
    "dossier.discoveries_heading": "Otkri\u0107a",
    "dossier.no_discoveries": "Nema novih informacija za sada.",
    "dossier.new_badge": "NOVO",

    // ── Dossier bios ──
    "dossier.lila-chen.bio": "Va\u0161 partner na ovom slu\u010daju. Pragmati\u010dna i tehnolo\u0161ki ve\u0161ta sa suvim smislom za humor. Ima pristup zvani\u010dnim izve\u0161tajima, forenzi\u010dkim a\u017euriranjima i pregledima nadzora. Poznata po mirnom i metodi\u010dnom pristupu pod pritiskom.",
    "dossier.amelia-reyes.bio": "Glavni in\u017eenjer hotela Lyric Atrium, \u017eestoko lojalna nasle\u0111u zgrade. Dr\u017ei jedini klju\u010d prostorije za odr\u017eavanje i nadgledala je sve tehni\u010dke sisteme tokom gale. Kolege je opisuju kao preciznu i ponosnu. Otvoreno kriti\u010dna prema Merserovim planovima za modernizaciju hotela.",
    "dossier.noah-sterling.bio": "Koosni\u0161a\u010d Merserovog startapa Panopticon za nadzor, zadu\u017een za odnose sa investitorima i javnost. Harizamati\u010dan i medijski obu\u010den. Osnovao kompaniju sa D\u017eulijanom Merserom i nedavno vodio razvoj platforme. Bio je na sceni sa prezentacijom kad je nestalo struje.",
    "dossier.celeste-ward.bio": "Nagra\u0111ivana d\u017eez peva\u010dica anga\u017eovana za nastup u speakeasy salonu na gali. Magnetska i emocionalno zatvorena. Tabloidi su spekulisali o vezi sa Merserom, mada se javno distancira od korporativne politike.",
    "dossier.matthias-holt.bio": "Direktor obezbe\u0111enja hotela Lyric Atrium. Biv\u0161i vojni obave\u0161tajac \u2014 dve ture u inostranstvu. Strog, principijelan, sa crno-belim pogledom na svet. Ima potpun pristup svim hotelskim bezbednosnim sistemima uklju\u010duju\u0107i kamere, senzore i \u010dita\u010de kartica. Koordinirao je hitne protokole tokom nestanka struje.",
    "dossier.mira-kline.bio": "Eti\u010darka i konsultant sa doktoratom iz bioetike. Merser ju je anga\u017eovao pre \u0161est meseci da pregleda usklađenost i eti\u010dki profil Panopticona. Ranije objavljivala radove kriti\u010dne prema neregulisanim tehnologijama nadzora. Vodila je okrugli sto o etici u biblioteci tokom nestanka struje.",
    "dossier.eddie-voss.bio": "In\u017eenjerski \u0161ti\u0107enik Amelije Rejes i mladi in\u017eenjer hotela. Uprkos talentu za in\u017eenjering, prava strast mu je miksologija \u2014 dobrovoljno je slu\u017eio VIP bar ve\u010deras. Radi u Lyric Atriumu tri godine. Me\u0111u osobljem poznat po nervoznoj naravi i \u017eelji da udovolji. Pomagao da se gosti smire tokom nestanka struje.",
    "dossier.priya-shah.bio": "Istra\u017eiva\u010dka novinarka koja prati zloupotrebe u oblasti korporativnog nadzora. Do\u0161la na galu kao pozvana \u0161tampa da pokrije predstavljanje Panopticona. Ranije je objavljivala pri\u010de o zlouporeti u tehnolo\u0161koj industriji. O\u0161tra, istra\u017ena i za\u0161titni\u010dka prema izvorima. Novinarska akreditacija joj je omogu\u0107ila pristup ve\u0107ini prostorija.",
    "dossier.matthew-vale.bio": "Pedantan slobodni menad\u017eer scene zadu\u017een za osvetljenje, zvu\u010dne signale i tehni\u010dku produkciju gale. Radio je doga\u0111aje u Lyric Atriumu dve godine. Prati svaki signal i logistiku izvo\u0111a\u010da sa operativnom precizno\u0161\u0107u. Ostao je iza scene koordiniraju\u0107i \u0161ou tokom nestanka struje.",

    // ── Conversation starters (3 per NPC) ──
    "starter.lila-chen.1": "\u0160ta znamo o \u017ertvi do sada?",
    "starter.lila-chen.2": "Koga treba prvo da saslu\u0161am?",
    "starter.lila-chen.3": "Provedi me kroz hronologiju doga\u0111aja ve\u010deras.",

    "starter.amelia-reyes.1": "Recite mi o ovom hotelu i va\u0161oj ulozi ovde.",
    "starter.amelia-reyes.2": "Ko ima pristup prostoriji za odr\u017eavanje?",
    "starter.amelia-reyes.3": "Kako biste opisali va\u0161 odnos sa D\u017eulijanom Merserom?",

    "starter.noah-sterling.1": "Kakav je bio va\u0161 poslovni odnos sa Merserom?",
    "starter.noah-sterling.2": "Recite mi o lansiranju Panopticona ve\u010deras.",
    "starter.noah-sterling.3": "Da li je bilo finansijskih sporova izme\u0111u vas i Mersera?",

    "starter.celeste-ward.1": "Kako ste poznavali D\u017eulijana Mersera?",
    "starter.celeste-ward.2": "Pri\u010dajte mi o va\u0161em nastupu na gali ve\u010deras.",
    "starter.celeste-ward.3": "Gde ste bili kad je nestalo struje?",

    "starter.matthias-holt.1": "Ispri\u010dajte mi \u0161ta se desilo tokom nestanka struje.",
    "starter.matthias-holt.2": "Postoje li snimci sigurnosnih kamera od ve\u010deras?",
    "starter.matthias-holt.3": "Ko je imao pristup opservatoriji na krovu?",

    "starter.mira-kline.1": "Koja je ta\u010dno va\u0161a uloga u projektu Panopticon?",
    "starter.mira-kline.2": "Da li ste imali eti\u010dke primedbe na Merserov rad?",
    "starter.mira-kline.3": "Koliko dobro ste poznavali D\u017eulijana Mersera li\u010dno?",

    "starter.eddie-voss.1": "Da li ste primetili ne\u0161to neubi\u010dajeno ve\u010deras?",
    "starter.eddie-voss.2": "Ko je bio za barom oko vremena ubistva?",
    "starter.eddie-voss.3": "Pri\u010dajte mi o va\u0161em radu ovde u hotelu.",

    "starter.priya-shah.1": "\u0160ta vas je dovelo na galu ve\u010deras?",
    "starter.priya-shah.2": "Na kojoj pri\u010di ste radili o Panopticonu?",
    "starter.priya-shah.3": "Da li vam je neko poku\u0161ao proslediti informacije ve\u010deras?",

    "starter.matthew-vale.1": "Bili ste iza scene tokom nestanka struje. \u0160ta se desilo?",
    "starter.matthew-vale.2": "Da li je neko napustio prostor scene tokom nestanka struje?",
    "starter.matthew-vale.3": "Da li ste primetili nekoga iza scene ko nije trebalo da bude tamo?",

    // ── Chat hint display (case-specific partner hints) ──
    "chat.hint_display.0": "\u0160ta misli\u0161 o ovom slu\u010daju do sada?",
    "chat.hint_display.1": "Pomozi mi \u2014 \u0161ta treba slede\u0107e da uradim?",
    "chat.hint_display.2": "Zaglavila sam. Kako ti vidi\u0161 situaciju?",
    "chat.hint_display.3": "Provedi me kroz ono \u0161to imamo do sada.",
    "chat.hint_display.4": "Lila, na \u0161ta treba da se fokusiram sada?",
    "chat.hint_display.5": "Daj mi pregled \u2014 gde stojimo?",
    "chat.hint_display.6": "\u0160ta ti ka\u017ee instinkt za ovaj slu\u010daj?",
    "chat.hint_display.7": "Ima\u0161 li ideju koga slede\u0107e treba da pritisnem?",
    "chat.hint_display.8": "Treba mi sve\u017ea perspektiva. \u0160ta propu\u0161tamo?",
    "chat.hint_display.9": "Pri\u010daj mi \u2014 \u0161ta smo do sada saznali?",

    // ── Endgame ──
    "endgame.title": "Svi Klju\u010dni Dokazi Prikupljeni",
    "endgame.description": "Prikupili ste sve klju\u010dne dokaze potrebne za izgradnju slu\u010daja. Pregledajte dokaze, izvr\u0161ite hap\u0161enje ili nastavite istragu za dodatne detalje.",
    "endgame.review": "Pregledaj Dokaze",
    "endgame.accuse": "Izvr\u0161i Hap\u0161enje",
    "endgame.continue": "Nastavi Istragu",
    "endgame.accuse_cta": "Spremni za Hap\u0161enje?",

    // ── Outcome screen ──
    "outcome.slam_dunk_title": "Slu\u010daj Zatvoren \u2014 Ubica Iza Re\u0161etaka",
    "outcome.slam_dunk_text": "<p>Va\u0161e hap\u0161enje <strong>{name}</strong> je nepobitno.</p><p>Noa Sterling je ubio D\u017eulijana Mersera da spre\u010di otkrivanje pronevere i preuzme kontrolu nad startapom Panopticon. Pritiskao je Edija Vosa da mu preda klju\u010d za odr\u017eavanje, a zatim ga iskoristio tokom nestanka struje da pristupi opservatoriji na krovu i ubije Mersera anti\u010dkim postoljem teleskopa.</p><p>Sa jasnim motivom i nepobitnim dokazom prisustva na mestu zlo\u010dina, tu\u017eila\u0161tvo osigurava punu osudu. Sterling odlazi na dugogodi\u0161nju robiju.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.plea_deal_title": "Nagodba \u2014 Kratka Kazna",
    "outcome.plea_deal_text": "<p>Uhapsili ste pravu osobu \u2014 <strong>{name}</strong> je ubio D\u017eulijana Mersera.</p><p>Me\u0111utim, va\u0161 slu\u010daj je utvrdio samo deo slike. Bez jasnog motiva i dokaza o prilici, tu\u017eila\u0161tvo je ponudilo nagodbu. Sterling prihvata smanjenu kaznu.</p><p>Pravi osumnji\u010deni, ali ostaje vam ose\u0107aj da ste mogli vi\u0161e.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.released_title": "Osumnji\u010deni Pu\u0161ten \u2014 Nedovoljno Dokaza",
    "outcome.released_text": "<p>Uhapsili ste <strong>{name}</strong>, i va\u0161 instinkt je bio ta\u010dan \u2014 on je ubica.</p><p>Ali bez dokaza koji utvr\u0111uju jasan motiv ili ga stavljaju na mesto zlo\u010dina, tu\u017eila\u0161tvo ga ne mo\u017ee zadr\u017eati. Sterling je pu\u0161ten i prikriva tragove. Slu\u010daj se gasi.</p><p>Verujete da ste na\u0161li ubicu, ali jednostavno ne mo\u017eete to da doka\u017eete.</p><p style=\"margin-top:1rem; color:var(--gold);\">Prikupljeni dokazi: {evidenceCount} &bull; Ispitani osumnji\u010deni: {interviewCount}</p>",
    "outcome.wrong_title": "Pogre\u0161an Osumnji\u010deni",
    "outcome.wrong_text": "<p>Uhapsili ste <strong>{name}</strong>, ali ta osoba nije ubica.</p><p>Pravi ubica izmi\u010de dok unutra\u0161nja kontrola dovodi u pitanje va\u0161 sud. Slu\u010daj se gasi.</p><p style=\"margin-top:1rem; color:var(--text-faint);\">Nastavite istragu \u2014 tra\u017eite kontradikcije u alibijima, pratite fizi\u010dke dokaze i trag klju\u010da za odr\u017eavanje.</p>",
    "outcome.restart": "Nova Istraga",

    // ── Title card ──
    "titlecard.open": "Otvori dosije",
    "titlecard.case_number": "Predmet #1247-B",
    "titlecard.division": "Odeljenje \u2014 Ubistva",

    // ── Keycard terminal ──
    "keycard.title": "\u25a0 HOTEL LYRIC ATRIUM \u2014 KONTROLA PRISTUPNIH KARTICA",
    "keycard.subtitle": "EVIDENCIJA \u2014 2024-11-15 \u2014 NO\u0106 GALE \u2014 SVE ZONE",
    "keycard.col_time": "VREME",
    "keycard.col_zone": "ZONA",
    "keycard.col_card": "KARTICA",
    "keycard.col_holder": "KORISNIK",
    "keycard.col_dir": "SMER",
    "keycard.col_status": "STATUS",
    "keycard.entry": "ULAZ",
    "keycard.exit": "IZLAZ",
    "keycard.granted": "ODOBRENO",
    "keycard.loading": "U\u010cITAVANJE ZAPISA O PRISTUPU...",
    "keycard.error": "GRE\u0160KA: NEMOGU\u0106E PREUZETI ZAPISE",
    "keycard.view_logs": "\u25b8 PREGLED SVIH ZAPISA",
    "keycard.system_offline": "NESTANAK STRUJE \u2014 Svi \u010dita\u010di kartica van funkcije. Aktivirano hitno osvetljenje. Rezervni generator nije uspeo da pokrene kontrolu pristupa.",
    "keycard.system_restored": "STRUJA POVRA\u0106ENA \u2014 Sistemi za kontrolu pristupa se ponovo pokre\u0107u. Svi \u010dita\u010di ponovo povezani. Sve zone se vra\u0107aju u normalan rad.",
    "keycard.zone.LOBBY-STAFF": "Slu\u017ebeni Ulaz (Bo\u010dni)",
    "keycard.zone.MAINT-LVL": "Nivo Odr\u017eavanja",
    "keycard.zone.CMD-CTR": "Komandni Centar Obezbe\u0111enja",
    "keycard.zone.KITCHEN": "Kuhinja i Priprema",
    "keycard.zone.BSTAGE": "Pozornica (Iza Scene)",
    "keycard.zone.BALL-MAIN": "Velika Balna Dvorana",
    "keycard.zone.BALL-SVC": "Servisni Hodnik Balne Dvorane",
    "keycard.zone.VIP-BAR": "VIP Bar i Salon",
    "keycard.zone.LOBBY-MAIN": "Glavni Ulaz (Lobi)",
    "keycard.zone.GUEST-7F": "Gostinski Sprat 7 (VIP)",
    "keycard.zone.SPEAK-LOUNGE": "Speakeasy Salon",
    "keycard.zone.LIBR-MAIN": "Hotelska Biblioteka",
    "keycard.zone.ROOF-OBS": "Krovna Opservatorija",
    "keycard.zone.ROOF-STAIR": "Krovne Servisne Stepenice",
    "keycard.zone.FRT-ELEV": "Teretni Lift",
    "keycard.zone.SVC-ELEV": "Servisni Lift",
    "keycard.zone.UTIL-CORR": "Tehni\u010dki Hodnik",
    "keycard.zone.CONF-2": "Sala za Sastanke 2",

    // ── Toast messages (case-specific) ──
    "toast.subpoena": "Sudski nalozi zahtevaju vreme. Nastavite istragu \u2014 ono \u0161to vam svedoci ka\u017eu o dokazima jednako je vredno kao i sam fizi\u010dki predmet.",
  };

  if (!window.I18N) window.I18N = {};
  if (!window.I18N.sr) window.I18N.sr = {};
  Object.assign(window.I18N.sr, keys);
})();
