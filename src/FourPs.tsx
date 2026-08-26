import { useState } from "react";

import type {
  CensusData,
  Family,
  Resident,
} from "./types/census";


import {
  HeartHandshake,
  ArrowLeft,
  UserRound,
    Search,

} from "lucide-react";

type FourPsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type FourPsResident = Resident & {
  householdNumber: string;
  familyName: string;
};

function FourPs({
  censusRecords,
  onBackToDashboard,
}: FourPsProps) {

      const [searchTerm, setSearchTerm] = useState("");

      const safeRecords: CensusData[] =
  Array.isArray(censusRecords)
    ? censusRecords.filter(
        (record): record is CensusData =>
          Boolean(record)
      )
    : [];

  const allResidents: FourPsResident[] =
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

  const isFourPsMember = (
  member: FourPsResident
) => {
    const value = String(
      member?.fourPsMember || ""
    )
      .trim()
      .toLowerCase();

    return (
      value === "yes" ||
      value === "member" ||
      value === "4ps member" ||
      value === "4ps"
    );
  };

  const fourPsMembers = allResidents.filter(
    (resident: FourPsResident) =>
      isFourPsMember(resident)
  );

  const notFourPsMembers = allResidents.filter(
    (resident: FourPsResident) =>
      !isFourPsMember(resident)
  );

    const filteredFourPsMembers = fourPsMembers.filter(
    (resident: FourPsResident) => {
      const fullName = [
        resident?.firstName,
        resident?.middleName,
        resident?.lastName,
        resident?.suffix,
      ]
        .filter(Boolean)
        .join(" ");

      const search = searchTerm
        .trim()
        .toLowerCase();

      if (!search) {
        return true;
      }

      return (
        fullName.toLowerCase().includes(search) ||
        String(
          resident?.familyName || ""
        )
          .toLowerCase()
          .includes(search) ||
        String(
          resident?.householdNumber || ""
        )
          .toLowerCase()
          .includes(search)
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
            DATA CATEGORY
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#172033",
            }}
          >
            4Ps
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View residents registered as members of
            the Pantawid Pamilyang Pilipino Program.
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


      {/* SUMMARY */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "28px",
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >

            <HeartHandshake
              size={19}
              strokeWidth={1.8}
            />

            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#168aad",
              }}
            >
              4PS MEMBERS
            </span>

          </div>

          <strong
            style={{
              display: "block",
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {fourPsMembers.length}
          </strong>

          <small
            style={{
              color: "#758094",
            }}
          >
            Registered 4Ps members
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >

            <UserRound
              size={19}
              strokeWidth={1.8}
            />

            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#7e8a9f",
              }}
            >
              NOT 4PS
            </span>

          </div>

          <strong
            style={{
              display: "block",
              fontSize: "28px",
              color: "#172033",
            }}
          >
            {notFourPsMembers.length}
          </strong>

          <small
            style={{
              color: "#758094",
            }}
          >
            Residents not registered
          </small>

        </div>

      </div>


      {/* RECORDS */}

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
              4PS RECORDS
            </span>

            <h2
              style={{
                margin: 0,
                color: "#172033",
              }}
            >
              4Ps Member Information
            </h2>

          </div>

        <div
          style={{
            position: "relative",
            width: "280px",
          }}
        >
          <Search
            size={17}
            strokeWidth={1.8}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#8993a5",
            }}
          />

          <input
            type="text"
            placeholder="Search resident..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #dfe4eb",
              borderRadius: "10px",
              padding: "11px 12px 11px 38px",
              outline: "none",
              fontSize: "13px",
              background: "white",
            }}
          />
        </div>

          <span
            style={{
              color: "#758094",
              fontSize: "13px",
            }}
          >
            {fourPsMembers.length} member
            {fourPsMembers.length !== 1
              ? "s"
              : ""}
          </span>

        </div>


{filteredFourPsMembers.length === 0 ? (
    
          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "50px",
              textAlign: "center",
            }}
          >

            <HeartHandshake
              size={34}
              strokeWidth={1.5}
            />

            <h3>
  {searchTerm
    ? "No matching resident found"
    : "No 4Ps members yet"}
</h3>

<p
  style={{
    color: "#758094",
  }}
>
  {searchTerm
    ? "Try searching using another resident, family, or household."
    : "4Ps member information will appear here after a census is submitted."}
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

           {filteredFourPsMembers.map(
  (
    resident: FourPsResident,
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

                        <HeartHandshake
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
                          4PS MEMBER
                        </span>

                        <span
                          style={{
                            fontSize: "12px",
                            color: "#758094",
                          }}
                        >
                          Registered resident
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
                        margin: "0 0 18px",
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
                          4Ps Status:
                        </strong>{" "}
                        {resident?.fourPsMember ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Sex:
                        </strong>{" "}
                        {resident?.sex || "—"}
                      </p>

                      <p>
                        <strong>
                          Civil Status:
                        </strong>{" "}
                        {resident?.civilStatus ||
                          "—"}
                      </p>

                      <p>
                        <strong>
                          Birth Date:
                        </strong>{" "}
                        {resident?.birthDate ||
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

export default FourPs;