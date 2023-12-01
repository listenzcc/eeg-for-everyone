console.log("Hello cc.");

let whoAmI = () => {
    let token = (await cookieStore.get('access_token')).value;

    $.ajax({
        url: "users/me",
        type: 'get',
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjaHVuY2hlbmciLCJleHAiOjE3MDEzOTkxODN9.9tkko7b1yBLjZo8P9I-kDZT951u8VeZtTYm_7f1ZPl0'
        }
    })

}