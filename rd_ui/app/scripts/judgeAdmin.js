function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		$("#login").action ='/non_admin'
	}
	return true;
}