function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		alert(1)
		$("#login").attr("action", "/views/non_admin/non_admin.html");
		// return false
	}
	return true;
}