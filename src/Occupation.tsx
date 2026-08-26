import {
  BriefcaseBusiness,
  ArrowLeft,
} from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "./types/census";

type OccupationProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type OccupationResident = Resident & {
  householdNumber: string;
  familyName: string;
};

function Occupation({
  censusRecords,
  onBackToDashboard,
}: OccupationProps) {

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allResidents: OccupationResident[] =
  safeRecords.flatMap(
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
            Occupation
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View occupation and employment information
            of all registered residents.
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

          <h3>
            No occupation records yet
          </h3>

          <p>
            Occupation information will appear here
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
            (resident: OccupationResident, index: number) => {

              const fullName = [
                resident?.firstName,
                resident?.middleName,
                resident?.lastName,
                resident?.suffix,
              ]
                .filter(Boolean)
                .join(" ");

              return (

                <div
                  key={index}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
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
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <BriefcaseBusiness
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
      OCCUPATION RECORD
    </span>

    <span
      style={{
        fontSize: "12px",
        color: "#758094",
      }}
    >
      Employment information
    </span>
  </div>
</div>

                  <h3
                    style={{
                      margin: "0 0 5px",
                      fontSize: "17px",
                    }}
                  >
                    {fullName || "Unnamed Resident"}
                  </h3>

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

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "16px",
                    }}
                  >

                    <p>
                      <strong>
                        Occupation:
                      </strong>{" "}
                    {resident?.primaryOccupation || "—"}

                    </p>

                    <p>
                      <strong>
                        Employment Status:
                      </strong>{" "}
                      {resident?.employmentStatus || "—"}
                    </p>

                    <p>
  <strong>
    Monthly Income:
  </strong>{" "}
  {resident?.monthlyIncome
    ? `₱${Number(resident.monthlyIncome).toLocaleString()}`
    : "—"}
</p>

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

export default Occupation;