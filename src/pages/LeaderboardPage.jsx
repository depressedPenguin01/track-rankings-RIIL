import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const events = ["All", "100m", "200m", "400m", "800m"];
const genders = ["All", "Boys", "Girls"];
const fieldEvents = ["Long Jump", "High Jump", "Shot Put", "Discus"];

function isBetterMark(candidate, currentBest) {
  if (!currentBest) return true;

  if (fieldEvents.includes(candidate.event)) {
    return candidate.numeric_mark > currentBest.numeric_mark;
  }

  return candidate.numeric_mark < currentBest.numeric_mark;
}

function getBestMarksPerAthlete(rows) {
  const bestMap = new Map();

  for (const row of rows) {
    const key = `${row.athlete}__${row.team}__${row.gender}__${row.event}`;
    const currentBest = bestMap.get(key);

    if (isBetterMark(row, currentBest)) {
      bestMap.set(key, row);
    }
  }

  return Array.from(bestMap.values());
}

function getWeekLabel(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(`${dateString}T00:00:00`);
  const start = new Date(date);

  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-based week
  start.setDate(start.getDate() + diff);

  return start.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart) {
  if (!weekStart || weekStart === "Unknown") return "Unknown";

  const date = new Date(`${weekStart}T00:00:00`);

  return `Week of ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function LeaderboardPage() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedVenue, setSelectedVenue] = useState("All");
  const [selectedWeek, setSelectedWeek] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMarks();
  }, []);

  async function fetchMarks() {
    setLoading(true);

    const { data, error } = await supabase.from("marks").select("*");

    if (error) {
      console.error("Error loading marks:", error);
      setMarks([]);
    } else {
      setMarks(data || []);
    }

    setLoading(false);
  }

  const venues = useMemo(() => {
    const uniqueVenues = Array.from(
      new Set(marks.map((row) => row.venue).filter(Boolean))
    ).sort();

    return ["All", ...uniqueVenues];
  }, [marks]);

  const weeks = useMemo(() => {
    const uniqueWeeks = Array.from(
      new Set(marks.map((row) => getWeekLabel(row.date)).filter(Boolean))
    ).sort();

    return ["All", ...uniqueWeeks];
  }, [marks]);

  const filteredMarks = useMemo(() => {
    let rows = [...marks];

    if (selectedEvent !== "All") {
      rows = rows.filter((row) => row.event === selectedEvent);
    }

    if (selectedGender !== "All") {
      rows = rows.filter((row) => row.gender === selectedGender);
    }

    if (selectedVenue !== "All") {
      rows = rows.filter((row) => row.venue === selectedVenue);
    }

    if (selectedWeek !== "All") {
      rows = rows.filter((row) => getWeekLabel(row.date) === selectedWeek);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.athlete?.toLowerCase().includes(q) ||
          row.team?.toLowerCase().includes(q) ||
          row.venue?.toLowerCase().includes(q) ||
          row.meet?.toLowerCase().includes(q)
      );
    }

    // Only dedupe when ranking a specific event.
    // This keeps all marks visible in broader views, but rankings clean.
    if (selectedEvent !== "All") {
      rows = getBestMarksPerAthlete(rows);
    }

    rows.sort((a, b) => {
      if (a.event !== b.event) {
        return a.event.localeCompare(b.event);
      }

      if (fieldEvents.includes(a.event)) {
        return b.numeric_mark - a.numeric_mark;
      }

      return a.numeric_mark - b.numeric_mark;
    });

    return rows.slice(0, 40);
  }, [
    marks,
    selectedEvent,
    selectedGender,
    selectedVenue,
    selectedWeek,
    search,
  ]);

  const leaderboardModeLabel =
    selectedEvent === "All"
      ? "Showing raw filtered marks."
      : "Showing each athlete's best mark for the selected event and filters.";

  return (
    <>
      <section className="panel">
        <h2>Filters</h2>

        <div className="filters">
          <div>
            <label>Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Athlete, team, meet, venue"
            />
          </div>

          <div>
            <label>Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {events.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Gender</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
            >
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Venue</label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
            >
              {venues.map((venue) => (
                <option key={venue} value={venue}>
                  {venue}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Week</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weeks.map((week) => (
                <option key={week} value={week}>
                  {week === "All" ? "All" : formatWeekLabel(week)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ marginTop: "12px", color: "#4b5563" }}>{leaderboardModeLabel}</p>
      </section>

      <section className="panel">
        <h2>Top Marks</h2>

        {loading ? (
          <p>Loading marks...</p>
        ) : filteredMarks.length === 0 ? (
          <p>No marks match the current filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Athlete</th>
                  <th>Team</th>
                  <th>Gender</th>
                  <th>Event</th>
                  <th>Mark</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Meet</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.athlete}</td>
                    <td>{row.team}</td>
                    <td>{row.gender}</td>
                    <td>{row.event}</td>
                    <td>{row.mark}</td>
                    <td>{row.date}</td>
                    <td>{row.venue}</td>
                    <td>{row.meet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}