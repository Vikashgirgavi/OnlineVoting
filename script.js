const SUPABASE_URL = "https://sphpwfcxgwplakcpdkye.supabase.co";
const SUPABASE_KEY = "sb_publishable_RAn5qCWEZ5AI8rg1h88GdQ_zizd7V5n";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================================
   VARIABLES
========================================= */

let currentVoter = null;
let candidates = [];


/* =========================================
   HTML ELEMENTS
========================================= */

const voterIdInput = document.getElementById("voterId");
const verifyBtn = document.getElementById("verifyBtn");

const verificationMessage =
    document.getElementById("verificationMessage");

const voterDetails =
    document.getElementById("voterDetails");

const voterName =
    document.getElementById("voterName");

const voterConstituency =
    document.getElementById("voterConstituency");

const voterStatus =
    document.getElementById("voterStatus");

const candidateList =
    document.getElementById("candidateList");

const searchInput =
    document.getElementById("searchInput");


/* =========================================
   START APPLICATION
========================================= */

loadCandidates();
updateStatistics();


/* =========================================
   LOAD CANDIDATES FROM SUPABASE
========================================= */

async function loadCandidates() {

    const { data, error } = await supabaseClient
        .from("candidates")
        .select("*")
        .order("id");


    if (error) {

        console.error(error);

        candidateList.innerHTML =
            "<p>Unable to load candidates.</p>";

        return;
    }


    candidates = data;

    renderCandidates(candidates);
}


/* =========================================
   VOTER VERIFICATION
========================================= */

verifyBtn.addEventListener(
    "click",
    verifyVoter
);


voterIdInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            verifyVoter();
        }

    }
);


async function verifyVoter() {

    const voterId =
        voterIdInput.value.trim().toUpperCase();


    /* Check empty input */

    if (voterId === "") {

        showMessage(
            "Please enter your voter ID.",
            "error"
        );

        return;
    }


    /* Search voter in Supabase */

    const { data: voter, error } =
        await supabaseClient
            .from("voters")
            .select("*")
            .eq("voter_id", voterId)
            .eq("eligible", true)
            .maybeSingle();


    /* Database error */

    if (error) {

        console.error(error);

        showMessage(
            "Something went wrong while checking your voter ID.",
            "error"
        );

        return;
    }


    /* Voter not found */

    if (!voter) {

        currentVoter = null;

        voterDetails.classList.add("hidden");

        showMessage(
            "Voter ID not found or you are not eligible to vote.",
            "error"
        );

        renderCandidates(candidates);

        return;
    }


    /* Store verified voter */

    currentVoter = voter;


    /* Display voter information */

    voterName.textContent =
        voter.name;

    voterConstituency.textContent =
        voter.constituency;


    voterDetails.classList.remove("hidden");


    /* Check whether voter has already voted */

    const { data: previousVote, error: voteCheckError } =
        await supabaseClient
            .from("votes")
            .select("id")
            .eq("voter_id", voterId)
            .maybeSingle();


    if (voteCheckError) {

        console.error(voteCheckError);

        showMessage(
            "Unable to check voting status.",
            "error"
        );

        return;
    }


    /* Already voted */

    if (previousVote) {

        voterStatus.textContent =
            "Already Voted";

        voterStatus.style.color =
            "#dc3545";

        showMessage(
            "This voter has already voted. Multiple voting is not allowed.",
            "error"
        );

    }

    /* Has not voted */

    else {

        voterStatus.textContent =
            "Eligible to Vote";

        voterStatus.style.color =
            "#198754";

        showMessage(
            "Voter verified successfully. You can now vote.",
            "success"
        );

    }


    renderCandidates(candidates);

}


/* =========================================
   SHOW MESSAGE
========================================= */

function showMessage(message, type) {

    verificationMessage.textContent =
        message;

    verificationMessage.className =
        type;
}


/* =========================================
   DISPLAY CANDIDATES
========================================= */

function renderCandidates(list) {

    if (list.length === 0) {

        candidateList.innerHTML =
            "<p>No candidates found.</p>";

        return;
    }


    candidateList.innerHTML =
        list.map(function(candidate) {

            return `

                <div class="candidate-card">

                    <div class="candidate-symbol">
                        ${candidate.symbol}
                    </div>

                    <h3>
                        ${candidate.name}
                    </h3>

                    <div class="party">
                        ${candidate.party}
                    </div>

                    <p class="manifesto">
                        ${candidate.manifesto}
                    </p>

                    <button
                        class="vote-btn"
                        data-id="${candidate.id}"
                    >
                        Vote for Candidate
                    </button>

                </div>

            `;

        }).join("");


    /* Add event to vote buttons */

    document
        .querySelectorAll(".vote-btn")
        .forEach(function(button) {

            button.addEventListener(
                "click",
                function() {

                    const candidateId =
                        button.getAttribute("data-id");

                    castVote(candidateId);

                }
            );

        });


    /* Disable buttons if voter is not verified */

    if (!currentVoter) {

        document
            .querySelectorAll(".vote-btn")
            .forEach(function(button) {

                button.disabled = true;

            });

    }

}


/* =========================================
   CAST VOTE
========================================= */

async function castVote(candidateId) {


    /* Voter must be verified */

    if (!currentVoter) {

        alert(
            "Please verify your voter ID first."
        );

        return;
    }


    /* Check again whether voter already voted */

    const { data: previousVote, error: checkError } =
        await supabaseClient
            .from("votes")
            .select("id")
            .eq("voter_id", currentVoter.voter_id)
            .maybeSingle();


    if (checkError) {

        console.error(checkError);

        alert(
            "Unable to check voting status."
        );

        return;
    }


    if (previousVote) {

        alert(
            "This voter has already voted."
        );

        return;
    }


    /* Find candidate */

    const candidate =
        candidates.find(function(item) {

            return item.id == candidateId;

        });


    if (!candidate) {
        return;
    }


    /* Ask for confirmation */

    const confirmation =
        confirm(
            "Are you sure you want to vote for " +
            candidate.name +
            "?"
        );


    if (!confirmation) {
        return;
    }


    /* Insert vote into Supabase */

    const { error } =
        await supabaseClient
            .from("votes")
            .insert({

                voter_id: currentVoter.voter_id,

                candidate_id: candidate.id

            });


    /* Database rejected the vote */

    if (error) {

        console.error(error);


        if (error.code === "23505") {

            alert(
                "This voter has already voted."
            );

        }

        else {

            alert(
                "Vote could not be submitted."
            );

        }

        return;
    }


    /* Vote successfully stored */

    voterStatus.textContent =
        "Vote Cast Successfully";

    voterStatus.style.color =
        "#198754";


    showMessage(
        "Your vote has been recorded successfully!",
        "success"
    );


    /* Disable all vote buttons */

    document
        .querySelectorAll(".vote-btn")
        .forEach(function(button) {

            button.disabled = true;

            button.textContent =
                "Vote Recorded";

        });


    /* Update results */

    loadResults();

    updateStatistics();

}


/* =========================================
   SEARCH CANDIDATES
========================================= */

searchInput.addEventListener(
    "input",
    function() {

        const searchText =
            searchInput.value.toLowerCase();


        const filteredCandidates =
            candidates.filter(function(candidate) {

                return (

                    candidate.name
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    candidate.party
                        .toLowerCase()
                        .includes(searchText)

                );

            });


        renderCandidates(filteredCandidates);

    }
);


/* =========================================
   LOAD VOTING RESULTS
========================================= */

async function loadResults() {

    const resultsList =
        document.getElementById("resultsList");


    const totalVotesElement =
        document.getElementById("totalVotes");


    /* Get all votes */

    const { data: votes, error } =
        await supabaseClient
            .from("votes")
            .select("candidate_id");


    if (error) {

        console.error(error);

        resultsList.innerHTML =
            "<p>Unable to load results.</p>";

        return;
    }


    const totalVotes =
        votes.length;


    /* Count votes for every candidate */

    resultsList.innerHTML =
        candidates.map(function(candidate) {


            const candidateVotes =
                votes.filter(function(vote) {

                    return vote.candidate_id == candidate.id;

                }).length;


            let percentage = 0;


            if (totalVotes > 0) {

                percentage =
                    Math.round(
                        (candidateVotes / totalVotes) * 100
                    );

            }


            return `

                <div class="result-item">

                    <div class="result-top">

                        <span>
                            ${candidate.symbol}
                            ${candidate.name}
                        </span>

                        <span>
                            ${candidateVotes}
                            votes (${percentage}%)
                        </span>

                    </div>

                    <div class="result-bar">

                        <div
                            class="result-fill"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </div>

            `;

        }).join("");


    totalVotesElement.textContent =
        totalVotes;

}


/* =========================================
   UPDATE STATISTICS
========================================= */

async function updateStatistics() {


    /* Eligible voters */

    const { count: voterCount } =
        await supabaseClient
            .from("voters")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("eligible", true);


    document.getElementById(
        "eligibleCount"
    ).textContent = voterCount || 0;


    /* Candidate count */

    const { count: candidateCount } =
        await supabaseClient
            .from("candidates")
            .select("*", {
                count: "exact",
                head: true
            });


    document.getElementById(
        "candidateCount"
    ).textContent = candidateCount || 0;


    /* Vote count */

    const { count: voteCount } =
        await supabaseClient
            .from("votes")
            .select("*", {
                count: "exact",
                head: true
            });


    document.getElementById(
        "votesCount"
    ).textContent = voteCount || 0;


    /* Load result section */

    loadResults();

}


/* =========================================
   START RESULTS
========================================= */

loadResults();










function goToVerify() {
    document.getElementById("verify").scrollIntoView({
        behavior: "smooth"
    });
}