import { GraduationCap, ArrowLeft } from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";

type EducationProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

function Education({
  censusRecords,
  onBackToDashboard,
}: EducationProps) {

  type EducationResident = Resident & {
  householdNumber: string;
  familyName: string;
};

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allResidents = safeRecords.flatMap(
   (record: CensusData) => {
      const families = Array.isArray(record?.families)
        ? record.families
        : [];

      return families.flatMap((family: Family) => {
        const members = Array.isArray(family?.members)
          ? family.members
          : [];

        return members.map((member: Resident) => ({
          ...member,
          householdNumber:
            record?.householdNumber || "—",
          familyName:
            family?.familyName || "Unnamed Family",
        }));
      });
    }
  );

  // =====================================================
  // EDUCATION COUNTS
  // =====================================================

  const educationCounts: Record<string, number> = {};

allResidents.forEach(
  (resident: EducationResident) => {
    const education =
      resident.education || "Not Specified";

    const label = String(education).trim();

    educationCounts[label] =
      (educationCounts[label] || 0) + 1;
  }
);

  const educationSummary = Object.entries(
    educationCounts
  ).sort((a, b) => b[1] - a[1]);


  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

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
            Education
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View educational information of all
            registered residents.
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

          <ArrowLeft
            size={16}
            strokeWidth={1.8}
          />

          Back to Dashboard

        </button>

      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section
        style={{
          marginBottom: "28px",
        }}
      >

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >

          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "22px",
            }}
          >

            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
                marginBottom: "8px",
              }}
            >
              TOTAL RESIDENTS
            </span>

            <strong
              style={{
                fontSize: "28px",
                color: "#172033",
              }}
            >
              {allResidents.length}
            </strong>

            <small
              style={{
                display: "block",
                marginTop: "5px",
                color: "#758094",
              }}
            >
              Registered residents
            </small>

          </div>


          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "22px",
            }}
          >

            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
                marginBottom: "8px",
              }}
            >
              EDUCATION LEVELS
            </span>

            <strong
              style={{
                fontSize: "28px",
                color: "#172033",
              }}
            >
              {educationSummary.length}
            </strong>

            <small
              style={{
                display: "block",
                marginTop: "5px",
                color: "#758094",
              }}
            >
              Recorded categories
            </small>

          </div>

        </div>

      </section>


      {/* =================================================
          EDUCATION DISTRIBUTION
      ================================================= */}

      {educationSummary.length > 0 && (

        <section
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "28px",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              marginBottom: "20px",
            }}
          >

            <GraduationCap
              size={20}
              strokeWidth={1.8}
            />

            <h2
              style={{
                margin: 0,
                color: "#172033",
              }}
            >
              Educational Attainment
            </h2>

          </div>


          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >

            {educationSummary.map(
              ([label, count]) => {

                const maxCount =
                  educationSummary[0][1];

                const percentage =
                  maxCount > 0
                    ? (count / maxCount) * 100
                    : 0;

                return (

                  <div key={label}>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        marginBottom: "6px",
                      }}
                    >

                      <span
                        style={{
                          fontSize: "13px",
                          color: "#172033",
                        }}
                      >
                        {label}
                      </span>

                      <strong
                        style={{
                          fontSize: "13px",
                          color: "#172033",
                        }}
                      >
                        {count}
                      </strong>

                    </div>


                    <div
                      style={{
                        height: "8px",
                        background: "#edf0f5",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >

                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          background: "#4361ee",
                          borderRadius: "999px",
                        }}
                      />

                    </div>

                  </div>

                );
              }
            )}

          </div>

        </section>

      )}


      {/* =================================================
          RESIDENT EDUCATION RECORDS
      ================================================= */}

      <section>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >

          <div>

            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#8993a5",
                marginBottom: "4px",
              }}
            >
              EDUCATION RECORDS
            </span>

            <h2
              style={{
                margin: 0,
                color: "#172033",
              }}
            >
              Resident Education Information
            </h2>

          </div>

          <span
            style={{
              color: "#758094",
              fontSize: "13px",
            }}
          >
            {allResidents.length} resident
            {allResidents.length !== 1
              ? "s"
              : ""}
          </span>

        </div>


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

            <GraduationCap
              size={34}
              strokeWidth={1.5}
            />

            <h3>
              No education records yet
            </h3>

            <p>
              Education information will appear here
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
              (
                resident: EducationResident,
                index: number
              ) => {

                const fullName = [
                  resident?.firstName,
                  resident?.middleName,
                  resident?.lastName,
                  resident?.suffix,
                ]
                  .filter(Boolean)
                  .join(" ");

               const education =
  resident.education || "Not Specified";

                return (

                  <div
                    key={index}
                    style={{
                      background: "white",
                      border:
                        "1px solid #e7eaf0",
                      borderRadius: "14px",
                      padding: "22px",
                    }}
                  >

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
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >

                        <GraduationCap
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
                            letterSpacing:
                              "0.08em",
                            color: "#8993a5",
                          }}
                        >
                          EDUCATION RECORD
                        </span>

                        <span
                          style={{
                            fontSize: "12px",
                            color: "#758094",
                          }}
                        >
                          Resident information
                        </span>

                      </div>

                    </div>


                    <h3
                      style={{
                        margin: "0 0 5px",
                        fontSize: "17px",
                      }}
                    >
                      {fullName ||
                        "Unnamed Resident"}
                    </h3>


                    <p
                      style={{
                        margin:
                          "0 0 18px",
                        color: "#8993a5",
                        fontSize: "12px",
                      }}
                    >
                      Family:{" "}
                      {resident?.familyName}
                      {" · "}
                      Household:{" "}
                      {resident?.householdNumber}
                    </p>


                    <div
                      style={{
                        borderTop:
                          "1px solid #eef0f4",
                        paddingTop: "16px",
                      }}
                    >

                      <p>
                        <strong>
                          Education:
                        </strong>{" "}
                        {education}
                      </p>

                      <p>
                        <strong>
                          School Status:
                        </strong>{" "}
                        {resident?.schoolStatus ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          School Level:
                        </strong>{" "}
                        {resident?.schoolLevel ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Elementary School:
                        </strong>{" "}
                        {resident?.elementarySchool ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Junior High School:
                        </strong>{" "}
                        {resident?.juniorHighSchool ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Senior High School:
                        </strong>{" "}
                        {resident?.seniorHighSchool ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          College / University:
                        </strong>{" "}
                        {resident?.collegeUniversity ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Course:
                        </strong>{" "}
                        {resident?.course ||
                          "—"}
                      </p>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

    </main>
  );
}

export default Education;