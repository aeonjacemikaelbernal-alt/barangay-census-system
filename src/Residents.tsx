import { useEffect, useState } from "react";
import "./dashboard.css";
import { UserRound, Cake, Vote } from "lucide-react";
import { supabase } from "./supabaseClient";

type Resident = {
  resident_id: number;
  household_id: number | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  birth_date: string | null;
  civil_status: string | null;
  relationship: string | null;
  resident_type: string | null;
  has_own_family: boolean | null;
};

function Residents() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResidents();
  }, []);

  async function loadResidents() {
    setLoading(true);

    const { data, error } = await supabase
      .from("resident_overview")
      .select("*")
      .order("resident_id", { ascending: true });

    if (error) {
      console.error("Error loading residents:", error);
      setResidents([]);
    } else {
      setResidents(data || []);
    }

    setLoading(false);
  }

  return (
    <main className="dashboard-main">

      <header className="dashboard-header">

        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1>
            Residents
          </h1>

          <p className="dashboard-description">
            View all registered residents from census records.
          </p>
        </div>

      </header>

      <section className="dashboard-section">

        <div className="section-heading">
          <div>
            <span>
              RESIDENT RECORDS
            </span>

            <h2>
              All Residents
            </h2>
          </div>

          <p>
            {loading
              ? "Loading..."
              : `${residents.length} registered resident${
                  residents.length !== 1 ? "s" : ""
                }`}
          </p>
        </div>

        <div className="recent-records">

          {loading ? (

            <div className="recent-record-card">
              <div className="recent-record-main">
                <strong>Loading residents...</strong>
              </div>
            </div>

          ) : residents.length === 0 ? (

            <div className="recent-record-card">
              <div className="recent-record-main">
                <strong>No residents found.</strong>

                <p>
                  There are currently no residents in the resident overview.
                </p>
              </div>
            </div>

          ) : (

            residents.map((resident) => (

              <div
                className="recent-record-card"
                key={resident.resident_id}
              >

                <div className="recent-record-icon">
                  <UserRound
                    size={22}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="recent-record-main">

                  <div className="recent-record-title">

                    <strong>
                      {resident.first_name || ""}
                      {" "}
                      {resident.middle_name || ""}
                      {" "}
                      {resident.last_name || ""}
                      {resident.suffix
                        ? ` ${resident.suffix}`
                        : ""}
                    </strong>

                    <span>
                      {resident.sex || "—"}
                    </span>

                  </div>

                  <div className="recent-record-location">

                    <span>
                      Relationship:{" "}
                      {resident.relationship || "—"}
                    </span>

                    <span>
                      Resident Type:{" "}
                      {resident.resident_type || "—"}
                    </span>

                    <span>
                      Civil Status:{" "}
                      {resident.civil_status || "—"}
                    </span>

                  </div>

                  <div className="recent-record-stats">

                    <span>
                      <Cake
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.birth_date || "—"}
                    </span>

                    <span>
                      <Vote
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.has_own_family === true
                        ? "Has Own Family"
                        : resident.has_own_family === false
                        ? "No Own Family"
                        : "—"}
                    </span>

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      </section>

    </main>
  );
}

export default Residents;