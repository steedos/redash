function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		$("#login").action ='/views/non_admin.html'
	}
	return true;
}