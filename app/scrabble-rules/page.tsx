import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ScrabbleRulesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">Scrabble Tournament Rules</h1>
            <p className="text-lg text-muted-foreground">Official rules for the Rendezvous Scrabble Tournament</p>
          </div>

          <Card className="border-border">
            <CardContent className="prose prose-slate max-w-none p-8">
              <p className="text-base leading-relaxed">
                This will be a single-elimination timed tournament using standard Scrabble rules unless otherwise noted
                below:{" "}
                <a
                  href="https://www.hasbro.com/common/instruct/Scrabble_(2003).pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Official Scrabble Rules (PDF)
                </a>
              </p>

              <ul className="my-6 space-y-4 text-base leading-relaxed">
                <li>Each game will be played between two players with a random bracket draw.</li>

                <li>
                  Players may not consult their smartphones during a game but may use the provided paper copy of "The
                  Cheat Sheet":{" "}
                  <a
                    href="https://www.cross-tables.com/download/CHEAT_PRO_2014.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Download Cheat Sheet (PDF)
                  </a>
                </li>

                <li>
                  Each game will have an arbiter who records scoring, manages the timer, and resolves any word
                  challenges via their smartphone:{" "}
                  <a
                    href="https://scrabblewordfinder.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Scrabble Word Finder
                  </a>
                </li>

                <li>
                  A chess timer will be used for each game that allows a maximum of 20 minutes per player per game. This
                  will motivate players to keep the pace moving and will help the tourney continue efficiently.
                </li>

                <li>
                  If a player runs out of time, their score cannot increase further and their opponent can continue
                  playing (if needed to try to get ahead on score).
                </li>

                <li>
                  The timer continues running until a player plays their tiles, tallies the score audibly, and announces
                  it to the arbiter to be written down. Then the arbiter toggles the timer to the other player.
                </li>

                <li>
                  If the arbiter or opponent believes the word(s) played is(are) invalid, they must announce such
                  immediately. The arbiter then pauses the timer and makes a determination. If the play is valid, the
                  score is recorded and the timer is toggled to the other player. If the play is invalid, the tiles are
                  returned to the player, they lose their turn, and the timer is toggled to the other player.
                </li>

                <li>
                  We will have 3 timers and 3 Scrabble sets, so 3 games will run concurrently during the tournament.
                  Active players should remain nearby so new games can be started efficiently. Spectators are encouraged
                  to watch silently.
                </li>
              </ul>

              <div className="mt-8 flex justify-center">
                <Button asChild size="lg">
                  <a href="/scrabble">View Word Lists & Cheat Sheet</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
