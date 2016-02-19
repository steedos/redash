function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		$("#login").attr("action", "/login?next=unadmin");
		// return false
	}
	return true;
}