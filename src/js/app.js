App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,
    votedForID: 0,
    finishPoll: 0,
    mins: 0,
    timerId: null,  

    init: function () {
        return App.initWeb3();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                console.error("사용자가 계정 액세스를 거부했습니다.")
            }
            App.web3Provider = window.ethereum;
        }
        else {
            console.error("Ethereum이 아닌 브라우저가 감지되었습니다. MetaMask를 사용해 보는 것이 좋습니다!");
        }
    
        App.web3 = new Web3(App.web3Provider);
    
        const accounts = await App.web3.eth.getAccounts();
        App.web3.eth.defaultAccount = accounts[0];
        await App.initContract(); 
    },
    
    
    
    
    


    initContract: function () {
        const contractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"indexed_candidateId","type":"uint256"}],"name":"votedEvent","type":"event"},
        {"inputs":[{"internalType":"string","name":"_CfirstName","type":"string"},{"internalType":"string","name":"_ClastName","type":"string"},{"internalType":"string","name":"_CidNumber","type":"string"}],"name":"addCandidate","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"string","name":"_firstName","type":"string"},{"internalType":"string","name":"_lastName","type":"string"},{"internalType":"string","name":"_idNumber","type":"string"},{"internalType":"string","name":"_email","type":"string"},{"internalType":"string","name":"_password","type":"string"}],"name":"addUser","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"candidates","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"CfirstName","type":"string"},{"internalType":"string","name":"ClastName","type":"string"},{"internalType":"string","name":"CidNumber","type":"string"},{"internalType":"uint256","name":"voteCount","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"candidatesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"manager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"users","outputs":[{"internalType":"string","name":"firstName","type":"string"},{"internalType":"string","name":"lastName","type":"string"},{"internalType":"string","name":"idNumber","type":"string"},{"internalType":"string","name":"email","type":"string"},{"internalType":"string","name":"password","type":"string"},{"internalType":"address","name":"add","type":"address"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"usersCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"_candidateId","type":"uint256"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"voters","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
        const contractAddress = "0xb65F1d77C7857dDd601FB8523c22D8E81796f2E9";
    
        App.contracts.Poll = new App.web3.eth.Contract(contractABI, contractAddress)
    
        App.listenForEvents();

        return App.render();

    },



    // 계약에서 발생하는 이벤트를 수신.
    // 이 이벤트를 수신할 수 없으면 Chrome을 다시 시작해야 함.
    listenForEvents: function () {
        App.contracts.Poll.getPastEvents('votedEvent', {
            fromBlock: 0,
            toBlock: 'latest'
        }, function(error, events){ 
            console.log(events); 
        }).then(function(events){
            console.log(events) // same results as the optional callback above
        });
    },





    //페이지의 모든 콘텐츠를 레이아웃하는 함수를 렌더링합니다.
    render: async function () {
        var loader = $("#loader");
        var content = $("#content");

        loader.show();
        content.hide();

        // 계정 로드
        await ethereum.request({ method: 'eth_accounts' }).then(accounts => {
            if (accounts.length === 0) {
                console.error("계정을 찾을 수 없습니다.");
            } else {
                App.account = App.web3.eth.defaultAccount;
                $("#accountAddress").html("계정 주소: " + App.account);
                console.log(App.account);
            }
        });


        //contracts 가져오기
        var pollInstance = App.contracts.Poll;

        try {
            var manager = await pollInstance.methods.manager().call();
            if (manager !== App.account) {
                document.querySelector('.buy-tickets').style.display = 'none';
            }

            var candidatesCount = await pollInstance.methods.candidatesCount().call();
            var candidatesResults = $("#candidatesResults");
            candidatesResults.empty();

            var candidatesSelect = $('#candidatesSelect');
            candidatesSelect.empty();

            for (var i = 1; i <= candidatesCount; i++) {
                var candidate = await pollInstance.methods.candidates(i).call();
                var id = candidate[0];
                var fname = candidate[1];
                var lname = candidate[2];
                var idNumber = candidate[3];
                var voteCount = candidate[4];

                // 렌더링 후보 결과
                var candidateTemplate = "<tr><th>" + id + "</th><td>" + fname + " " + lname + "</td><td>" + idNumber + "</td><td>" + voteCount + "</td></tr>"
                candidatesResults.append(candidateTemplate);

                //후보자 투표옵션 렌더링
                var candidateOption = "<option value='" + id + "' >" + fname + " " + lname + "</ option>"
                candidatesSelect.append(candidateOption);
            }

            var hasVoted = await pollInstance.methods.voters(App.account).call();
            // 사용자가 두 번 투표하는 것을 허용안함
            if (hasVoted) {
                $('form').hide();
                $("#index-text").html("성공적으로 로그인되었습니다!");
                $("#new-candidate").html("새로운 후보자를 추가");
                $("#vote-text").html(localStorage.getItem("votedForID") + "번 후보자에게 성공적으로 투표했습니다. ");
            }
            loader.hide();
            content.show();

            var usersCount = await pollInstance.methods.usersCount().call();
            var voterz = $("#voterz");
            voterz.empty();

            for (var i = 1; i <= usersCount; i++) {
                var user = await pollInstance.methods.users(i).call();
                var firstName = user[0];
                var lastName = user[1];
                var idNumber = user[2];
                var email = user[3];
                var address = user[5];

                let voterTemplate = "<tr><td>" + firstName + " " + lastName + "</td><td>" + idNumber + "</td><td>" + email + "</td><td>" + address + "</td></tr>"
                voterz.append(voterTemplate);
            }

            if (localStorage.getItem("finishPoll") === "0") {
                $('form').hide();
                $("#index-text").html("현재 진행 중인 투표가 없습니다.");
                $("#vote-text").html("진행 중인 투표가 없습니다.");

                document.querySelector('.addCandidateForm').style.display = 'block';
                document.querySelector('.vot').style.display = 'none';
            } else if (localStorage.getItem("finishPoll") === "1") {

            }
        } catch (error) {
            console.warn(error);
        }
    },




    castVote: function () {
        var candidateId = $('#candidatesSelect').val();
        App.votedForID = candidateId;
        localStorage.setItem("votedForID", candidateId);
        App.contracts.Poll.methods.vote(candidateId).send({ from: App.account }).then(function (result) {
            // Wait for votes to update
            $("#content").hide();
            $("#loader").show();
            location.href = 'results.html';
        }).catch(function (err) {
            console.error(err);
        });
    },



    addUser: async function () {
        var firstName = $('#firstName').val();
        var lastName = $('#lastName').val();
        var idNumber = $('#idNumber').val();
        var email = $('#email').val();
        var password = $('#password').val();
        await App.contracts.Poll.methods.addUser(firstName, lastName, idNumber, email, password).send({ from: App.account });
        $("#content").hide();
        $("#loader").show();
        document.querySelector('.vot').style.display = 'block';
        location.href = 'vote.html';
    },
    
    



    addCandidate: async function () {
        var CfirstName = $('#CfirstName').val();
        var ClastName = $('#ClastName').val();
        var CidNumber = $('#CidNumber').val();
        await App.contracts.Poll.methods.addCandidate(CfirstName, ClastName, CidNumber).send({ from: App.account });
        $("#content").hide();
        $("#loader").show();
        location.href = 'admin.html';
    },


    login: async function () {
        var lidNumber = $('#lidNumber').val();
        var lpassword = $('#lpassword').val();
        var users = await App.contracts.Poll.methods.users().call();
        var usersCount = await App.contracts.Poll.methods.usersCount().call();

        for (var i = 1; i <= usersCount; i++) {
            App.contracts.Poll.methods.users(i).call().then(function (user) {
                var idNumber = user[2];
                var password = user[4];

                if (lidNumber === idNumber) {
                    if (lpassword === password) {
                        location.href = 'results.html';
                    } else {
                        prompt("잘못된 로그인 정보입니다. 다시 시도해 주세요.");
                    }
                    return;
                }
            });
        }
    },

    startTimer: function (seconds) {
        var remainingSeconds = seconds;

        this.timerId = setInterval(function () {
            var hours = Math.floor(remainingSeconds / 3600);
            remainingSeconds %= 3600;
            var minutes = Math.floor(remainingSeconds / 60);
            var seconds = remainingSeconds % 60;

            document.getElementById('timer').textContent = hours + ":" + minutes + ":" + seconds;
            console.log(hours + ":" + minutes + ":" + seconds);
            remainingSeconds--;
            if (remainingSeconds < 0) {
                clearInterval(this.timerId);
            }
        }.bind(this), 1000);

    },

    stopTimer: function () {
        clearInterval(this.timerId);
    },

    startPoll: function () {
        localStorage.setItem("finishPoll", "1");
        location.href = 'index.html';

        // 타이머 시작
        timer(24 * 60 * 60);  // 24시간을 초로 변환
    },

    endPoll: function () {
        localStorage.setItem("finishPoll", "0");
        location.href = 'results.html';
        // 타이머 종료
        this.stopTimer();
    }

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
