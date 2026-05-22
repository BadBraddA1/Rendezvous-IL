import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default function ScrabblePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 pt-20 pb-12 md:pt-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">Scrabble Tournament</h1>
            <p className="text-lg text-muted-foreground">Word lists for the Rendezvous Scrabble Tournament</p>
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg" variant="outline">
                  <a href="/scrabble-rules">Tournament Rules</a>
                </Button>
                <Button asChild size="lg">
                  <a
                    href="https://yixdedkxmmcaglqi.public.blob.vercel-storage.com/Scrabble%20Cheat%20Sheet.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Cheat Sheet
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="prose prose-slate mx-auto max-w-none rounded-lg border border-border bg-card p-8">
            <div className="mb-6 text-sm text-muted-foreground">
              <p>
                These word lists are adapted from SCRABBLE® Wordbook by Mike Baron, Sterling Publishing, 2007, and
                Official Tournament and Club Word List, 2014 Edition. For more information about SCRABBLE® Wordbook, see{" "}
                <a
                  href="https://www.amazon.com/SCRABBLE-Wordbook-Mike-Baron/dp/1402750862"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.amazon.com/SCRABBLE-Wordbook-Mike-Baron/dp/1402750862
                </a>{" "}
                or your local bookstore. 11/14
              </p>
            </div>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">2-Letter Words</h2>
              <div className="grid grid-cols-5 gap-2 text-sm md:grid-cols-10">
                {[
                  "AA",
                  "AB",
                  "AD",
                  "AE",
                  "AG",
                  "AH",
                  "AI",
                  "AL",
                  "AM",
                  "AN",
                  "AR",
                  "AS",
                  "AT",
                  "AW",
                  "AX",
                  "AY",
                  "BA",
                  "BE",
                  "BI",
                  "BO",
                  "BY",
                  "DA",
                  "DE",
                  "DO",
                  "ED",
                  "EF",
                  "EH",
                  "EL",
                  "EM",
                  "EN",
                  "ER",
                  "ES",
                  "ET",
                  "EX",
                  "FA",
                  "FE",
                  "GI",
                  "GO",
                  "HA",
                  "HE",
                  "HI",
                  "HM",
                  "HO",
                  "ID",
                  "IF",
                  "IN",
                  "IS",
                  "IT",
                  "JO",
                  "KA",
                  "KI",
                  "LA",
                  "LI",
                  "LO",
                  "MA",
                  "ME",
                  "MI",
                  "MM",
                  "MO",
                  "MU",
                  "MY",
                  "NA",
                  "NE",
                  "NO",
                  "NU",
                  "OD",
                  "OE",
                  "OF",
                  "OH",
                  "OI",
                  "OM",
                  "ON",
                  "OP",
                  "OR",
                  "OS",
                  "OW",
                  "OX",
                  "OY",
                  "PA",
                  "PE",
                  "PI",
                  "PO",
                  "QI",
                  "RE",
                  "SH",
                  "SI",
                  "SO",
                  "TA",
                  "TE",
                  "TI",
                  "TO",
                  "UH",
                  "UM",
                  "UN",
                  "UP",
                  "US",
                  "UT",
                  "WE",
                  "WO",
                  "XI",
                  "XU",
                  "YA",
                  "YE",
                  "YO",
                  "ZA",
                ].map((word) => (
                  <span key={word} className="rounded bg-muted px-2 py-1 text-center font-mono">
                    {word}
                  </span>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Short J Words</h2>
              <div className="space-y-2 text-sm">
                <p className="font-mono leading-relaxed">
                  JO AJI HAJ JAB JAG JAM JAR JAW JAY JEE JET JEU JEW JIB JIG JIN JOB JOE JOG JOT JOW JOY JUG JUN JUS JUT
                  RAJ TAJ
                </p>
                <p className="font-mono leading-relaxed">
                  AJAR AJEE AJIS DJIN DOJO FUJI GOJI HADJ HAJI HAJJ JABS JACK JADE JAGG JAGS JAIL JAKE JAMB JAMS JANE
                  JAPE JARL JARS JATO JAUK JAUP JAVA JAWS JAYS JAZZ JEAN JEED JEEP JEER JEES JEEZ JEFE JEHU JELL JEON
                  JERK JESS JEST JETE JETS JEUX JEWS JIAO JIBB JIBE JIBS JIFF JIGS JIGS JILL JILT JIMP JINK JINN JINS
                  JINX JIRD JISM JIVE JIVY JIZZ JOBS JOCK JOES JOEY JOGS JOHN JOGS JOGA JOHN JOKE JOKY JOLE JOLT JOOK
                  JOSH JOSS JOTA JOTS JOUK JOWL JOWS JOYS JUBA JUBE JUCO JUDO JUDO JUDY JUGA JUGS JUJU JUKE JUKU JUMP
                  JUNK JUPE JURA JURY JUST JUTE JUTS KOJI MOJO PUJA RAJA SOJA SOJU
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Short Q Words</h2>
              <div className="space-y-2 text-sm">
                <p className="font-mono leading-relaxed">
                  QI QAT QIS QUA SUQ AQUA CINQ QADI QAID QATS QOPH QUAD QUAG QUAI QUAY QUEY QUID QUIN QUIP QUIT QUIZ
                  QUOD SUQS
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Short X Words</h2>
              <div className="space-y-2 text-sm">
                <p className="font-mono leading-relaxed">
                  AX EX OX XI XU AXE BOX COX DEX FAX FIX FOX GOX HEX KEX LAX LEX LOX LUX MAX MIX MUX NIX OXO OXY PAX PIX
                  POX PYX RAX REX SAX SEX SIX SOX TAX TIX TUX VOX WAX XED XIS ZAX
                </p>
                <p className="font-mono leading-relaxed">
                  APEX AXES AXIL AXIS AXLE AXON BOXY BRUX CALX COAX COXA CRUX DEXY DOUX DOXY EAUX EXAM EXEC EXED EXES
                  EXIT EXON EXPO FALX FAUX FIXT FLAX FLEX FLUX FOXY HOAX IBEX ILEX IXIA JEUX JINX LUXE LYNX MAXI MINX
                  MIXT MOXA NEXT NIXE NIXY ONYX ORYX OXEN OXER OXES OXIC OXID OXIM PIXY PLEX POXY PREX ROUX SEXT SEXY
                  TAXA TAXI TEXT VEXT WAXY XYST
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Short Z Words</h2>
              <div className="space-y-2 text-sm">
                <p className="font-mono leading-relaxed">
                  ZA ADZ AZO BIZ COZ CUZ FEZ FIZ LEZ REZ SEZ TIZ WIZ WUZ YEZ ZAG ZAP ZAS ZAX ZED ZEE ZEK ZEP ZIG ZIN ZIP
                  ZIT ZOA ZOO ZUZ ZZZ
                </p>
                <p className="font-mono leading-relaxed">
                  ADZE AZAN AZON BAZZ BIZE BOZO BUZZ CAZH CHEZ COZY CZAR DAZE DITZ DOZE DOZY FAZE FIZZ FOZY FRIZ FUTZ
                  FUZE FUZZ GAZE GEEZ GRIZ HAZE HAZY IZAR JAZZ JEEZ JIZZ LAZE LAZY LUTZ MAZE MAZY MEZE MOZO NAZI OOZE
                  OOZY ORZO OUZO OYEZ PHIZ PREZ PUTZ QUIZ RAZE RAZZ RITZ SIZE SIZY SPAZ TIZZ TZAR WHIZ YUTZ YUZU ZAGS
                  ZANY ZAPS ZARF ZEAL ZEBU ZEDA ZEDS ZEES ZEIN ZEKS ZEPS ZERK ZERO ZEST ZETA ZIGS ZILL ZINC ZINE ZING
                  ZINS ZIPS ZITI ZITS ZIZZ ZOEA ZOIC ZONA ZONE ZONK ZOOM ZOON ZOOS ZORI ZOUK ZYME
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Vowel Dumps & I Dumps</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold">Vowel Dumps</h3>
                  <p className="font-mono leading-relaxed">
                    AA AE AI OE OI EAU ACAI AEON AERO AGEE AGIO AGUE AIDE AJEE AKEE ALAE ALEE ALOE AMIA AMIE ANOA AQUA
                    AREA ARIA ASEA AUTO AURA AWEE BEAU CIAO EASE EAUX EAVE EIDE EMEU EPEE ETUI EURO IDEA ILEA ILIA INIA
                    IOTA IXIA JIAO LIEU LUAU MEOU MOUE NAOI OBIA OBOE ODEA OGEE OHIA OLEA OLEO OLIO OOZE OUTA OUZO PAUA
                    QUAI RAIA ROUE TOEA UNAI UNAU UREA UVEA ZOEA
                  </p>
                  <p className="mt-2 font-mono leading-relaxed">
                    AALII AECIA AERIE AIOLI AUDIO AQUAE AREAE AURAE AUREI COOEE EERIE LOOIE LOUIE MIAOU OIDIA OORIE
                    OURIE QUEUE URAEI ZOEAE
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">I Dumps</h3>
                  <p className="font-mono leading-relaxed">
                    AALII BIDI HILI IBIS ILIA IMID IMPI INIA INTI IRID IRIS IWIS IXIA KIWI LIRI MIDI MINI MIRI NIDI NISI
                    PIKI PILI TIKI TIPI TITI WIKI ZITI BIKINI BIMINI IMIDIC IRIDIC IRITIC IRITIS
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">U Dumps</h2>
              <div className="space-y-2 text-sm">
                <p className="font-mono leading-relaxed">
                  ULU ULUS BUBU FUGU GURU JUJU JUKU KUDU KURU LUAU MUMU PUDU PUPU SULU TUTU UNAU URUS YUZU MUUMUU
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Bingos</h2>
              <div className="mb-4 text-sm text-muted-foreground">
                <p>
                  A "bingo" is a play using all 7 of your tiles, netting a 50-point bonus. Among experts the winner, on
                  average, out-bingos the loser 2-to-1. Below are the three top-rated bingo stems and the bingos they
                  form with the addition of one letter.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">TISANE + ?</h3>
                  <p className="text-sm font-mono leading-relaxed">
                    ENTASIA TAENIAS BANTIES BASINET ACETINS CINEAST DESTAIN DETAINS INSTEAD NIDATES SAINTED SATINED
                    STAINED ETESIAN FAINEST EASTING EATINGS GENISTA INGATES INGESTA SEATING TEASING TAGINES SHEITAN
                    STHENIA ISATINE TAJINES INTAKES ELASTIN ENTAILS NAILSET SALIENT SALTINE SLAINTE TENAILS ETAMINS
                    INMATES TAMEINS INANEST STANINE ATONIES PANTIES PATINES SAPIENT SPINATE ANESTRI ANTSIER NASTIER
                    RATINES RETAINS RETINAS RETSINA STAINER STEARIN PARTIES PASTIER PIASTER PIASTRE PIRATES PRATIES
                    TRAIPSE ARTSIER TARRIES TARSIER ARTSIES SATIRES ARTIEST ARTISTE ATTIRES IRATEST RATITES STRIATE
                    TASTIER RAVIEST VASTIER VERITAS WAISTER WAITERS WARIEST WASTRIE
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">SATIRE + ?</h3>
                  <p className="text-sm font-mono leading-relaxed">
                    ARISTAE ASTERIA ATRESIA BAITERS BARITES REBAITS TERBIAS ATRESIC CRISTAE RACIEST STEARIC ARIDEST
                    ASTRIDE DIASTER DISRATE STAIDER TARDIES TIRADES AERIEST SERIATE FAIREST AIGRETS GAITERS SEAGIRT
                    STAGIER TRIAGES HASTIER AIRIEST REALIST RETAILS SALTIER SALTIRE SLATIER TAILERS IMARETS MAESTRI
                    MISRATE SMARTIE ANESTRI ANTSIER NASTIER RATINES RETAINS RETINAS RETSINA STAINER STEARIN PARTIES
                    PASTIER PIASTER PIASTRE PIRATES PRATIES TRAIPSE ARTSIER TARRIES TARSIER ARTSIES SATIRES ARTIEST
                    ARTISTE ATTIRES IRATEST RATITES STRIATE TASTIER RAVIEST VASTIER VERITAS WAISTER WAITERS WARIEST
                    WASTRIE
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">RETINA + ?</h3>
                  <p className="text-sm font-mono leading-relaxed">
                    CERATIN CERTAIN CREATIN TACRINE ANTIRED DETRAIN TRAINED ARENITE RETINAE TRAINEE FAINTER GRANITE
                    GRATINE INGRATE TANGIER TEARING HAIRNET INEARTH THERIAN INERTIA KERATIN LATRINE RATLINE RELIANT
                    RETINAL TRENAIL MINARET RAIMENT ENTRAIN TRANNIE INAPTER PAINTER PERTAIN REPAINT RETRAIN TERRAIN
                    TRAINER ANESTRI ANTSIER NASTIER RATINES RETAINS RETINAS RETSINA STAINER STEARIN INTREAT ITERANT
                    NATTIER NITRATE TERTIAN RUINATE TAURINE URANITE URINATE TAWNIER TINWARE
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
              <p>"The Cheat Sheet" may be freely downloaded from cross-tables.com/cs</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
