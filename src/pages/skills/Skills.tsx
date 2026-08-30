import { Wrench, ArrowLeft } from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";

type SkillsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type SkillsResident = Resident & {
  householdNumber: string;
  familyName: string;
};

function Skills({
  censusRecords,
  onBackToDashboard,
}: SkillsProps) {

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

 const allResidents: SkillsResident[] =
  safeRecords.flatMap(
    (record: CensusData) => {
      const families = Array.isArray(record.families)
        ? record.families
        : [];

      return families.flatMap(
        (family: Family) => {
          const members = Array.isArray(family.members)
            ? family.members
            : [];

          return members.map(
            (member: Resident) => ({
              ...member,
              householdNumber:
                record.householdNumber || "—",
              familyName:
                family.familyName || "Unnamed Family",
            })
          );
        }
      );
    }
  );

  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >

        <div>

          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#172033",
            }}
          >
            Skills
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View resident skills and specialties.
          </p>

        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background: "white",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          Back to Dashboard
        </button>

      </div>

      {/* TOTAL */}

      <div
        style={{
          marginBottom: "20px",
          color: "#758094",
          fontSize: "14px",
        }}
      >
        Total residents:{" "}
        <strong>
          {allResidents.length}
        </strong>
      </div>

      {/* RECORDS */}

      {allResidents.length === 0 ? (

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >

          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              background: "#f0f4f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 15px",
            }}
          >
            <Wrench
              size={23}
              strokeWidth={1.8}
            />
          </div>

          <h3>
            No skills records yet
          </h3>

          <p>
            Skills information will appear here
            after a census is submitted.
          </p>

        </div>

      ) : (

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "16px",
          }}
        >

          {allResidents.map(
           (resident: SkillsResident, index: number) => {

              const fullName = [
                resident?.firstName,
                resident?.middleName,
                resident?.lastName,
                resident?.suffix,
              ]
                .filter(Boolean)
                .join(" ");

             const skillLabels = resident.skills
  ? resident.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
  : [];

              return (

                <div
                  key={`${fullName}-${index}`}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >

                  {/* CARD HEADER */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >

                    <div
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "11px",
                        background: "#f0f4f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >

                      <Wrench
                        size={21}
                        strokeWidth={1.8}
                      />

                    </div>

                    <div>

                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "#8993a5",
                        }}
                      >
                        SKILLS RECORD
                      </span>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "#758094",
                        }}
                      >
                        Resident skills and specialties
                      </span>

                    </div>

                  </div>

                  {/* NAME */}

                  <h3
                    style={{
                      margin: "0 0 5px",
                      fontSize: "17px",
                    }}
                  >
                    {fullName || "Unnamed Resident"}
                  </h3>

                  {/* FAMILY / HOUSEHOLD */}

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "#8993a5",
                      fontSize: "12px",
                    }}
                  >
                    Family: {resident?.familyName}
                    {" · "}
                    Household: {resident?.householdNumber}
                  </p>

                  {/* SKILLS */}

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "16px",
                    }}
                  >

                    <p
                      style={{
                        margin: "0 0 10px",
                      }}
                    >
                      <strong>
                        Skills:
                      </strong>
                    </p>

                    {skillLabels.length === 0 ? (

                      <span
                        style={{
                          color: "#8993a5",
                          fontSize: "14px",
                        }}
                      >
                        —
                      </span>

                    ) : (

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >

                        {skillLabels.map(
                          (
                            skill,
                            skillIndex
                          ) => (

                            <span
                              key={`${skill}-${skillIndex}`}
                              style={{
                                display: "inline-block",
                                padding: "7px 11px",
                                borderRadius: "8px",
                                background: "#f0f4f9",
                                color: "#3d4a60",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {skill}
                            </span>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </div>

              );
            }
          )}

        </div>

      )}

    </main>
  );
}

export default Skills;