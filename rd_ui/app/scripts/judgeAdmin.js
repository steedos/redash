function checkUser(){ 
	if('admin'!=$("#inputEmail").val())
	{
		$("#form").action ='/views/non_admin.html'
	}
	return true;
}