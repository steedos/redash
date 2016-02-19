function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		alert(1)
		$("#login").attr("action", "/login?next=unadmin");
		// return false
	}
	return true;
}