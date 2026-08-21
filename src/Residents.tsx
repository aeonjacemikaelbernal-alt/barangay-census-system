import "./dashboard.css";

type ResidentsProps = {
  censusRecords: any[];
};

function Residents({ censusRecords }: ResidentsProps) {
  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const residents = safeRecords.flatMap((record: any) => {
    const families = Array.isArray(record?.families)
      ? record.families
      : [];

    return families.flatMap((family: any) => {
      const members = Array.isArray(family?.members)
        ? family.members
        : [];

      return members.map((member: any) => ({
        ...member,
        familyName: family?.familyName || "",
        householdNumber: record?.householdNumber || "",
      }));
    });
  });

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
            {residents.length} registered resident
            {residents.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="recent-records">

          {residents.map(
            (resident: any, index: number) => (

              <div
                className="recent-record-card"
                key={`${resident.householdNumber}-${index}`}
              >

                <div className="recent-record-icon">
                  👤
                </div>

                <div className="recent-record-main">

                  <div className="recent-record-title">
                    <strong>
                      {resident.firstName}{" "}
                      {resident.middleName}{" "}
                      {resident.lastName}
                    </strong>

                    <span>
                      {resident.sex || "—"}
                    </span>
                  </div>

                  <div className="recent-record-location">

                    <span>
                      Family:{" "}
                      {resident.familyName || "—"}
                    </span>

                    <span>
                      Household:{" "}
                      {resident.householdNumber || "—"}
                    </span>

                    <span>
                      Occupation:{" "}
                      {resident.primaryOccupation || "—"}
                    </span>

                  </div>

                  <div className="recent-record-stats">

                    <span>
                      🎂 {resident.birthDate || "—"}
                    </span>

                    <span>
                      🗳 {resident.voterStatus || "—"}
                    </span>

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </section>

    </main>
  );
}

export default Residents;