import { useState } from "react";
import {
  Vote,
  ArrowLeft,
  UserRound,
  Search,
  Filter,
} from "lucide-react";

type VotersProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Voters({
  censusRecords,
  onBackToDashboard,
}: VotersProps) {

  const [searchTerm, setSearchTerm] = useState("");
  const [voterFilter, setVoterFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState("all");

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allFamilies = safeRecords.flatMap(
    (record: any) =>
      Array.isArray(record?.families)
        ? record.families
        : []
  );

  const allMembers = allFamilies.flatMap(
    (family: any) =>
      Array.isArray(family?.members)
        ? family.members.map((member: any) => ({
            ...member,
            familyName:
              family?.familyName || "Unnamed Family",
            householdNumber:
              recordHouseholdNumber(
                safeRecords,
                member
              ),
          }))
        : []
  );

  function recordHouseholdNumber(
    records: any[],
    member: any
  ) {
    for (const record of records) {
      const families = Array.isArray(record?.families)
        ? record.families
        : [];

      for (const family of families) {
        const members = Array.isArray(family?.members)
          ? family.members
          : [];

        if (members.includes(member)) {
          return record?.householdNumber || "—";
        }
      }
    }

    return "—";
  }

  const isRegisteredVoter = (member: any) => {
    const voterStatus = String(
      member?.voterStatus || ""
    )
      .trim()
      .toLowerCase();

    return (
      voterStatus === "registered voter" ||
      voterStatus === "registered"
    );
  };

  const registeredVoters = allMembers.filter(
    (member: any) => isRegisteredVoter(member)
  );

  const notRegisteredVoters = allMembers.filter(
    (member: any) => !isRegisteredVoter(member)
  );

  const getFullName = (member: any) =>
    member?.fullName ||
    [
      member?.firstName,
      member?.middleName,
      member?.lastName,
      member?.suffix,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Resident";

  const voterRecords = allMembers.map(
    (member: any) => ({
      member,
      status: isRegisteredVoter(member)
        ? "Registered Voter"
        : "Not Registered",
    })
  );

  const filteredVoterRecords = voterRecords.filter(
    (record: any) => {

      const member = record.member;

      const fullName = getFullName(member)
        .toLowerCase();

      const search = searchTerm
        .trim()
        .toLowerCase();

      const matchesSearch =
        search === "" ||
        fullName.includes(search);

      const matchesVoterFilter =
        voterFilter === "all" ||
        (voterFilter === "registered" &&
          record.status === "Registered Voter") ||
        (voterFilter === "not_registered" &&
          record.status === "Not Registered");

      const sex =
        String(member?.sex || "")
          .trim()
          .toLowerCase();

      const matchesSexFilter =
        sexFilter === "all" ||
        sex === sexFilter;

      return (
        matchesSearch &&
        matchesVoterFilter &&
        matchesSexFilter
      );
    }
  );

  return (
    <main className="dashboard-main">

      {/* HEADER */}

      <header className="dashboard-header">

        <div>

          <p className="dashboard-overline">
            DATA CATEGORY
          </p>

          <h1>
            Voters
          </h1>

          <p className="dashboard-description">
            View voter registration information.
          </p>

        </div>

        <button
          type="button"
          className="new-census-button"
          onClick={onBackToDashboard}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >

          <ArrowLeft
            size={16}
            strokeWidth={1.8}
          />

          Back to Dashboard

        </button>

      </header>


      {/* VOTER RECORDS */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              VOTER RECORDS
            </span>

            <h2>
              Voter Registration
            </h2>

          </div>

          <p>
            {registeredVoters.length} registered
            {" · "}
            {notRegisteredVoters.length} not registered
          </p>

        </div>


        {/* SUMMARY */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e7eaf0",
              borderRadius: "12px",
              padding: "18px 20px",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
              }}
            >

              <Vote
                size={18}
                strokeWidth={1.8}
              />

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#168aad",
                  letterSpacing: "0.08em",
                }}
              >
                REGISTERED
              </span>

            </div>

            <strong
              style={{
                display: "block",
                fontSize: "28px",
                color: "#172033",
              }}
            >
              {registeredVoters.length}
            </strong>

            <small
              style={{
                color: "#758094",
              }}
            >
              Registered voters
            </small>

          </div>


          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e7eaf0",
              borderRadius: "12px",
              padding: "18px 20px",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
              }}
            >

              <UserRound
                size={18}
                strokeWidth={1.8}
              />

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#7e8a9f",
                  letterSpacing: "0.08em",
                }}
              >
                NOT REGISTERED
              </span>

            </div>

            <strong
              style={{
                display: "block",
                fontSize: "28px",
                color: "#172033",
              }}
            >
              {notRegisteredVoters.length}
            </strong>

            <small
              style={{
                color: "#758094",
              }}
            >
              Not registered voters
            </small>

          </div>

        </div>


        {/* SEARCH + FILTERS */}

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e7eaf0",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "22px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >

            <Filter
              size={17}
              strokeWidth={1.8}
            />

            <strong
              style={{
                fontSize: "13px",
                color: "#172033",
              }}
            >
              Search & Filter
            </strong>

          </div>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 1fr) 190px 160px",
              gap: "12px",
            }}
          >

            {/* SEARCH */}

            <div
              style={{
                position: "relative",
              }}
            >

              <Search
                size={17}
                strokeWidth={1.8}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: "#8993a5",
                }}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search resident name..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "42px",
                  padding:
                    "0 12px 0 38px",
                  border:
                    "1px solid #dfe4eb",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "13px",
                  background: "#ffffff",
                }}
              />

            </div>


            {/* VOTER FILTER */}

            <select
              value={voterFilter}
              onChange={(event) =>
                setVoterFilter(
                  event.target.value
                )
              }
              style={{
                height: "42px",
                padding: "0 12px",
                border:
                  "1px solid #dfe4eb",
                borderRadius: "9px",
                background: "#ffffff",
                fontSize: "13px",
                color: "#3d4a60",
                outline: "none",
                cursor: "pointer",
              }}
            >

              <option value="all">
                All Voters
              </option>

              <option value="registered">
                Registered
              </option>

              <option value="not_registered">
                Not Registered
              </option>

            </select>


            {/* SEX FILTER */}

            <select
              value={sexFilter}
              onChange={(event) =>
                setSexFilter(
                  event.target.value
                )
              }
              style={{
                height: "42px",
                padding: "0 12px",
                border:
                  "1px solid #dfe4eb",
                borderRadius: "9px",
                background: "#ffffff",
                fontSize: "13px",
                color: "#3d4a60",
                outline: "none",
                cursor: "pointer",
              }}
            >

              <option value="all">
                All Sex
              </option>

              <option value="male">
                Male
              </option>

              <option value="female">
                Female
              </option>

            </select>

          </div>


          {/* FILTER RESULT */}

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#8993a5",
            }}
          >

            Showing{" "}
            <strong>
              {filteredVoterRecords.length}
            </strong>{" "}
            of{" "}
            <strong>
              {voterRecords.length}
            </strong>{" "}
            residents

            {(searchTerm ||
              voterFilter !== "all" ||
              sexFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setVoterFilter("all");
                  setSexFilter("all");
                }}
                style={{
                  marginLeft: "10px",
                  border: "none",
                  background: "transparent",
                  color: "#168aad",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Clear filters
              </button>
            )}

          </div>

        </div>


        {/* RESIDENT LIST */}

        <div className="recent-records">

          {filteredVoterRecords.length === 0 ? (

            <div className="recent-record-card">

              <div className="recent-record-main">

                <strong>
                  No matching residents found.
                </strong>

                <p>
                  Try changing your search or
                  filter options.
                </p>

              </div>

            </div>

          ) : (

            filteredVoterRecords.map(
              (
                record: any,
                index: number
              ) => {

                const member = record.member;

                const fullName =
                  getFullName(member);

                const registered =
                  record.status ===
                  "Registered Voter";

                return (

                  <div
                    className="recent-record-card"
                    key={`${fullName}-${index}`}
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
                          {fullName}
                        </strong>

                        <span>
                          {record.status}
                        </span>

                      </div>


                      <div className="recent-record-location">

                        {member?.sex && (
                          <span>
                            Sex: {member.sex}
                          </span>
                        )}

                        {(member?.birthDate ||
                          member?.birth_date) && (
                          <span>
                            Birth Date:{" "}
                            {member?.birthDate ||
                              member?.birth_date}
                          </span>
                        )}

                        {member?.civilStatus && (
                          <span>
                            Civil Status:{" "}
                            {member.civilStatus}
                          </span>
                        )}

                      </div>


                      <div className="recent-record-stats">

                        {member?.occupation && (
                          <span>
                            {member.occupation}
                          </span>
                        )}

                        <span>

                          <Vote
                            size={16}
                            strokeWidth={1.8}
                          />

                          {registered
                            ? "Registered Voter"
                            : "Not Registered"}

                        </span>

                      </div>

                    </div>

                  </div>

                );
              }
            )

          )}

        </div>

      </section>

    </main>
  );
}

export default Voters;