function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		$("#login").attr("action", "/login?next=non-admin");
		// return false
	}
	return true;
}