from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required

@login_required
def role_redirect(request):

    user = request.user
    groups = [g.name.lower() for g in user.groups.all()]

    print("USER GROUPS:", groups)   # debug line (you can remove later)

    if "police" in groups:
        return redirect('/api/police/')

    elif "hospital" in groups:
        return redirect('/api/hospital/')

    else:
        return redirect('/api/admin-dashboard/')