console.log("Hello cc.");

let whoAmI = () => {
    // let token = (await cookieStore.get('access_token')).value;

    let cookies = {}, token;

    document.cookie.split('; ').map(d => {
        let s = d.split('=')
        cookies[s[0]] = s[1]
    })

    console.log(cookies)

    token = cookies.access_token || ''

    $.ajax({
        url: "users/me",
        type: 'get',
        contentType: 'application/json',
        headers: {
            "Authorization": "Bearer " + token
        }
    }).done((msg) => {
        // Got msg
        console.log(msg)
    }).always(() => {
        // Default behavior
    }).fail((err) => {
        // Something is wrong
        console.error(err)
    })

}