function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		alert(1)
		$("#login").attr("action", "/login?next=%non_admin%2");
		// return false
	}
	return true;
}