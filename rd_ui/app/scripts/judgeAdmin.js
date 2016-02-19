function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		alert(1)
		$("#login").action ='/non_admin'
	}
	return true;
}