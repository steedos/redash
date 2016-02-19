function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		alert(1)
		$("#login").attr("action", "/views/non_admin");
	}
	return true;
}